"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import dynamic from 'next/dynamic';

// @ts-ignore
const Check: any = dynamic(() => import('lucide-react').then(mod => mod.Check), { ssr: false });
// @ts-ignore
const Plus: any = dynamic(() => import('lucide-react').then(mod => mod.Plus), { ssr: false });
// @ts-ignore
const Bookmark: any = dynamic(() => import('lucide-react').then(mod => mod.Bookmark), { ssr: false });
// @ts-ignore
const Trash2: any = dynamic(() => import('lucide-react').then(mod => mod.Trash2), { ssr: false });

interface AddToListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  problemId: number;
  problemTitle: string;
}

interface List {
  id: string;
  name: string;
  color: string;
  is_default: boolean;
  problem_count: number;
}

interface ListProblem {
  id: string;
  list_id: string;
}

export function AddToListDialog({ open, onOpenChange, problemId, problemTitle }: AddToListDialogProps) {
  const [loading, setLoading] = useState(false);
  const [lists, setLists] = useState<List[]>([]);
  const [selectedLists, setSelectedLists] = useState<Set<string>>(new Set());
  const [listProblemIds, setListProblemIds] = useState<Map<string, string>>(new Map());
  const [showCreateNew, setShowCreateNew] = useState(false);
  const [newListName, setNewListName] = useState('');

  useEffect(() => {
    if (open) {
      fetchLists();
      checkExistingLists();
    } else {
      // Reset state when dialog closes
      setSelectedLists(new Set());
      setListProblemIds(new Map());
      setShowCreateNew(false);
      setNewListName('');
    }
  }, [open, problemId]);

  const fetchLists = async () => {
    try {
      const response = await fetch('/api/study-plans');
      const data = await response.json();
      setLists(data.userLists || []);
    } catch (error) {
      console.error('Error fetching lists:', error);
    }
  };

  const checkExistingLists = async () => {
    try {
      // Check which lists already contain this problem
      const response = await fetch(`/api/study-plans/problems/check?problemId=${problemId}`);
      const data = await response.json();

      if (data.lists) {
        const listIds = new Set<string>(data.lists.map((l: any) => l.list_id));
        const problemMap = new Map<string, string>(data.lists.map((l: any) => [l.list_id, l.id]));
        setSelectedLists(listIds);
        setListProblemIds(problemMap);
      }
    } catch (error) {
      console.error('Error checking existing lists:', error);
    }
  };

  const handleAddToList = async (listId: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/study-plans/problems', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listId, problemId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add problem to list');
      }

      const { listProblem } = await response.json();

      setSelectedLists(prev => new Set(prev).add(listId));
      setListProblemIds(prev => new Map(prev).set(listId, listProblem.id));

      // Refresh lists to update counts
      await fetchLists();
    } catch (error: any) {
      console.error('Error adding to list:', error);
      if (!error.message.includes('already exists')) {
        alert(error.message || 'Failed to add problem to list');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromList = async (listId: string) => {
    const listProblemId = listProblemIds.get(listId);
    if (!listProblemId) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/study-plans/problems?id=${listProblemId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to remove problem from list');
      }

      setSelectedLists(prev => {
        const newSet = new Set(prev);
        newSet.delete(listId);
        return newSet;
      });

      setListProblemIds(prev => {
        const newMap = new Map(prev);
        newMap.delete(listId);
        return newMap;
      });

      // Refresh lists to update counts
      await fetchLists();
    } catch (error) {
      console.error('Error removing from list:', error);
      alert('Failed to remove problem from list');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSave = async () => {
    const defaultList = lists.find(l => l.is_default);
    if (defaultList) {
      await handleAddToList(defaultList.id);
      // Close dialog after quick save
      setTimeout(() => onOpenChange(false), 500);
    }
  };

  const handleCreateNewList = async () => {
    if (!newListName.trim()) return;

    setLoading(true);
    try {
      // Create the list
      const createResponse = await fetch('/api/study-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newListName }),
      });

      if (!createResponse.ok) {
        throw new Error('Failed to create list');
      }

      const { list } = await createResponse.json();

      // Add problem to the new list
      await handleAddToList(list.id);

      // Refresh lists
      await fetchLists();

      // Reset form
      setNewListName('');
      setShowCreateNew(false);
    } catch (error) {
      console.error('Error creating new list:', error);
      alert('Failed to create new list. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const defaultList = lists.find(l => l.is_default);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-white dark:bg-zinc-900 text-foreground backdrop-blur-xl border-border/40">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-brand" />
            Save Problem
          </DialogTitle>
          <DialogDescription>
            Add "{problemTitle}" to your study lists
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Quick Save to Default List */}
          {defaultList && !selectedLists.has(defaultList.id) && (
            <Button
              onClick={handleQuickSave}
              disabled={loading}
              className="w-full bg-gradient-to-r from-brand to-orange-300 hover:from-brand/90 hover:to-orange-300/90"
            >
              <Bookmark className="w-4 h-4 mr-2" />
              Quick Save to {defaultList.name}
            </Button>
          )}

          {defaultList && selectedLists.has(defaultList.id) && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/10 border border-green-500/30">
              <div className="flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-green-500" />
                <span className="text-sm font-medium">Saved to {defaultList.name}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 hover:bg-red-500/20"
                onClick={() => handleRemoveFromList(defaultList.id)}
                disabled={loading}
                title="Remove from list"
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </div>
          )}

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border/40" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white dark:bg-zinc-900 px-2 text-muted-foreground">Or choose a list</span>
            </div>
          </div>

          {/* List Selection */}
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {lists.filter(l => !l.is_default).map((list) => {
              const isSelected = selectedLists.has(list.id);
              return (
                <div
                  key={list.id}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
                    isSelected
                      ? 'bg-green-500/10 border-green-500/30'
                      : 'border-border/40 hover:bg-muted/50 hover:border-brand/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${list.color}`} />
                    <div className="text-left">
                      <p className="text-sm font-medium">{list.name}</p>
                      <p className="text-xs text-muted-foreground">{list.problem_count} problems</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isSelected ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 hover:bg-red-500/20"
                        onClick={() => handleRemoveFromList(list.id)}
                        disabled={loading}
                        title="Remove from list"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAddToList(list.id)}
                        disabled={loading}
                        title="Add to list"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Create New List */}
          {!showCreateNew ? (
            <Button
              variant="outline"
              onClick={() => setShowCreateNew(true)}
              className="w-full border-brand/30 hover:bg-brand/10 hover:border-brand/50"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create New List
            </Button>
          ) : (
            <div className="space-y-2 p-3 rounded-lg border border-brand/30 bg-brand/5">
              <Label htmlFor="newListName">New List Name</Label>
              <div className="flex gap-2">
                <Input
                  id="newListName"
                  placeholder="e.g., Arrays & Hashing"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateNewList()}
                  className="bg-background/50"
                />
                <Button
                  onClick={handleCreateNewList}
                  disabled={loading || !newListName.trim()}
                  size="sm"
                >
                  Create
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowCreateNew(false);
                  setNewListName('');
                }}
                className="w-full"
              >
                Cancel
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}