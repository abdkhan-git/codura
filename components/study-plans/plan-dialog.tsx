"use client";

import React, { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface PlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPlanCreated: () => void;
}

const colorOptions = [
  { value: 'from-brand to-orange-300', label: 'Orange Gradient', preview: 'bg-gradient-to-r from-brand to-orange-300' },
  { value: 'from-purple-500 to-pink-500', label: 'Purple Gradient', preview: 'bg-gradient-to-r from-purple-500 to-pink-500' },
  { value: 'from-blue-500 to-cyan-500', label: 'Blue Gradient', preview: 'bg-gradient-to-r from-blue-500 to-cyan-500' },
  { value: 'from-green-500 to-emerald-500', label: 'Green Gradient', preview: 'bg-gradient-to-r from-green-500 to-emerald-500' },
  { value: 'from-red-500 to-pink-500', label: 'Red Gradient', preview: 'bg-gradient-to-r from-red-500 to-pink-500' },
  { value: 'from-yellow-500 to-orange-500', label: 'Yellow Gradient', preview: 'bg-gradient-to-r from-yellow-500 to-orange-500' },
];

export function PlanDialog({ open, onOpenChange, onPlanCreated }: PlanDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: 'from-brand to-orange-300',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/study-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || 'Failed to create study plan');
        return;
      }

      // Reset form
      setFormData({
        name: '',
        description: '',
        color: 'from-brand to-orange-300',
      });

      toast.success('Study plan created successfully');
      onPlanCreated();
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating study plan:', error);
      toast.error('Failed to create study plan. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card/95 backdrop-blur-xl border-border/40">
        <DialogHeader>
          <DialogTitle>Create Study Plan</DialogTitle>
          <DialogDescription>
            Create a custom study plan to organize your problem-solving journey
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Plan Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Dynamic Programming Mastery"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="bg-background/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="Optional description for your plan"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="bg-background/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="color">Color Theme</Label>
              <Select
                value={formData.color}
                onValueChange={(value) => setFormData({ ...formData, color: value })}
              >
                <SelectTrigger className="bg-background/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {colorOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded ${option.preview}`} />
                        <span>{option.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-brand to-orange-300 hover:from-brand/90 hover:to-orange-300/90"
            >
              {loading ? 'Creating...' : 'Create Plan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}