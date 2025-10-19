"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Clock, X } from "lucide-react";
import type { PendingRequest } from "@/types/database";

interface SentRequestCardProps {
  request: PendingRequest;
  onCancel: (requestId: string) => void;
  onSelect?: (requestId: string) => void;
  isSelected?: boolean;
  actionLoading: string | null;
  viewMode: 'grid' | 'list';
  theme: string | undefined;
  index: number;
}

export function SentRequestCard({ 
  request, 
  onCancel, 
  onSelect,
  isSelected,
  actionLoading, 
  viewMode, 
  theme, 
  index 
}: SentRequestCardProps) {
  const [showActions, setShowActions] = useState(false);

  return (
    <Card className={cn(
      "p-6 border-2 backdrop-blur-xl transition-all duration-300 hover:shadow-lg animate-in fade-in-0 slide-in-from-bottom-4",
      theme === 'light' 
        ? "bg-white/80 border-black/5 hover:border-orange-500/20" 
        : "bg-zinc-950/80 border-white/5 hover:border-orange-500/20",
      viewMode === 'list' && "flex items-center gap-4",
      isSelected && "ring-2 ring-blue-500 bg-blue-50/50 dark:bg-blue-500/10"
    )} style={{ animationDelay: `${index * 50}ms` }}>
      <div className={cn("flex items-start gap-4", viewMode === 'list' && "flex-1")}>
        {/* Selection Checkbox */}
        {onSelect && (
          <input
            type="checkbox"
            checked={isSelected || false}
            onChange={() => onSelect(request.id)}
            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
          />
        )}
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center text-lg font-semibold shadow-lg",
            "bg-gradient-to-br from-brand to-orange-300 text-white shadow-brand/20"
          )}>
            {request.user.avatar_url ? (
              <img
                src={request.user.avatar_url}
                alt={request.user.full_name || request.user.username || 'User'}
                className="w-full h-full object-cover rounded-xl"
                onError={(e) => {
                  console.log('Sent request avatar image failed to load:', request.user.avatar_url);
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              (request.user.full_name || request.user.username || 'U').charAt(0).toUpperCase()
            )}
          </div>
          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-orange-500 rounded-full border-2 border-background"></div>
        </div>

        {/* User Info */}
        <div className={cn("flex-1 min-w-0", viewMode === 'list' && "flex items-center justify-between")}>
          <div className="min-w-0">
            <h3 className={cn(
              "font-semibold text-lg truncate",
              theme === 'light' ? "text-zinc-900" : "text-white"
            )}>
              {request.user.full_name || request.user.username || 'Anonymous'}
            </h3>
            <p className={cn(
              "text-sm truncate",
              theme === 'light' ? "text-zinc-600" : "text-zinc-400"
            )}>
              @{request.user.username || 'user'}
            </p>
            {request.message && (
              <p className={cn(
                "text-sm mt-2 italic",
                theme === 'light' ? "text-zinc-500" : "text-zinc-500"
              )}>
                "{request.message}"
              </p>
            )}
            <div className="flex items-center gap-4 mt-2">
              <span className={cn(
                "text-xs flex items-center gap-1",
                theme === 'light' ? "text-zinc-500" : "text-zinc-500"
              )}>
                <Clock className="w-3 h-3" />
                Sent {new Date(request.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 mt-4 lg:mt-0">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onCancel(request.id)}
              disabled={actionLoading === request.id}
              className={cn(
                "gap-2 transition-all duration-300",
                theme === 'light' 
                  ? "text-red-600 hover:bg-red-50 hover:text-red-700" 
                  : "text-red-400 hover:bg-red-500/10 hover:text-red-300"
              )}
            >
              {actionLoading === request.id ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
              ) : (
                <X className="w-4 h-4" />
              )}
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
