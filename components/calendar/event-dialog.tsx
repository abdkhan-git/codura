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
import dynamic from 'next/dynamic';

// @ts-ignore
const Code: any = dynamic(() => import('lucide-react').then(mod => mod.Code), { ssr: false });
// @ts-ignore
const Video: any = dynamic(() => import('lucide-react').then(mod => mod.Video), { ssr: false });
// @ts-ignore
const Users: any = dynamic(() => import('lucide-react').then(mod => mod.Users), { ssr: false });
// @ts-ignore
const RadioTower: any = dynamic(() => import('lucide-react').then(mod => mod.RadioTower), { ssr: false });

interface EventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date;
  onEventCreated: () => void;
  existingEvent?: any;
}

const eventTypes = [
  { value: 'solve_problem', label: 'Solve Problem', icon: Code, color: 'text-green-500' },
  { value: 'mock_interview', label: 'Mock Interview', icon: Video, color: 'text-purple-500' },
  { value: 'study_pod', label: 'Study Pod', icon: Users, color: 'text-blue-500' },
  { value: 'live_stream', label: 'Live Stream', icon: RadioTower, color: 'text-red-500' },
  { value: 'other', label: 'Other', icon: Code, color: 'text-gray-500' },
];

export function EventDialog({ open, onOpenChange, selectedDate, onEventCreated, existingEvent }: EventDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_type: 'solve_problem',
    start_time: '',
    end_time: '',
  });

  // Populate form when editing existing event
  React.useEffect(() => {
    if (existingEvent && open) {
      setFormData({
        title: existingEvent.title || '',
        description: existingEvent.description || '',
        event_type: existingEvent.event_type || 'solve_problem',
        start_time: existingEvent.start_time || '',
        end_time: existingEvent.end_time || '',
      });
    } else if (!open) {
      // Reset form when dialog closes
      setFormData({
        title: '',
        description: '',
        event_type: 'solve_problem',
        start_time: '',
        end_time: '',
      });
    }
  }, [existingEvent, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const isEditing = !!existingEvent;
      const url = isEditing
        ? `/api/calendar/events?id=${existingEvent.id}`
        : '/api/calendar/events';

      const response = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          event_date: selectedDate.toISOString().split('T')[0],
          start_time: formData.start_time || null,
          end_time: formData.end_time || null,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${isEditing ? 'update' : 'create'} event`);
      }

      // Reset form
      setFormData({
        title: '',
        description: '',
        event_type: 'solve_problem',
        start_time: '',
        end_time: '',
      });

      onEventCreated();
      onOpenChange(false);
    } catch (error) {
      console.error(`Error ${existingEvent ? 'updating' : 'creating'} event:`, error);
      alert(`Failed to ${existingEvent ? 'update' : 'create'} event. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const selectedEventType = eventTypes.find(type => type.value === formData.event_type);
  const EventIcon = selectedEventType?.icon || Code;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card/95 backdrop-blur-xl border-border/40">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <EventIcon className={`w-5 h-5 ${selectedEventType?.color}`} />
            {existingEvent ? 'Edit Calendar Event' : 'Create Calendar Event'}
          </DialogTitle>
          <DialogDescription>
            {existingEvent ? 'Update your event details' : `Schedule an event for ${selectedDate.toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric'
            })}`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Event Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Solve Two Sum problem"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                className="bg-background/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="event_type">Event Type *</Label>
              <Select
                value={formData.event_type}
                onValueChange={(value) => setFormData({ ...formData, event_type: value })}
              >
                <SelectTrigger className="bg-background/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {eventTypes.map((type) => {
                    const Icon = type.icon;
                    return (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <Icon className={`w-4 h-4 ${type.color}`} />
                          <span>{type.label}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="Optional notes or details"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="bg-background/50"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_time">Start Time</Label>
                <Input
                  id="start_time"
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  className="bg-background/50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end_time">End Time</Label>
                <Input
                  id="end_time"
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  className="bg-background/50"
                />
              </div>
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
              {loading ? (existingEvent ? 'Updating...' : 'Creating...') : (existingEvent ? 'Update Event' : 'Create Event')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}