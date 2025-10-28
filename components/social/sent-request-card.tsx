"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
      "group relative p-4 border border-slate-700/50 bg-card/90 backdrop-blur-xl overflow-hidden hover:border-cyan-500/30 hover:shadow-lg hover:shadow-cyan-500/10 transition-all duration-300 hover:scale-[1.01] animate-in slide-in-from-bottom-4 fade-in-0",
      viewMode === 'list' && "flex items-center gap-4",
      isSelected && "ring-2 ring-cyan-500 bg-cyan-500/10"
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
        <div className="relative flex-shrink-0 group-hover:scale-110 transition-all duration-500">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 via-blue-500/15 to-rose-500/20 rounded-2xl blur-lg group-hover:blur-xl transition-all duration-500" />
          <div className="relative w-14 h-14 rounded-2xl overflow-hidden border border-cyan-500/30 bg-gradient-to-br from-[#1a1f2e]/90 to-[#1e2430]/90 backdrop-blur-sm">
            {request.user.avatar_url ? (
              <img
                src={request.user.avatar_url}
                alt={request.user.full_name || request.user.username || 'User'}
                className="w-full h-full object-cover"
                onError={(e) => {
                  console.log('Sent request avatar image failed to load:', request.user.avatar_url);
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-cyan-500/30 via-blue-500/20 to-rose-500/30 flex items-center justify-center text-cyan-400 font-bold text-lg">
                {(request.user.full_name || request.user.username || 'U').charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-gradient-to-br from-cyan-500 to-rose-500 rounded-full border-2 border-[#1a1f2e] shadow-lg shadow-cyan-500/30" />
        </div>

        {/* User Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-lg truncate bg-gradient-to-r from-white via-cyan-400 to-rose-400 bg-clip-text text-transparent group-hover:from-cyan-300 group-hover:via-rose-300 group-hover:to-blue-300 transition-all duration-500">
              {request.user.full_name || request.user.username || 'Anonymous'}
            </h3>
            <Badge variant="secondary" className="text-xs bg-cyan-500/20 text-cyan-300 border-cyan-500/30">
              Pending
            </Badge>
          </div>
          <p className="text-sm text-slate-400 truncate group-hover:text-cyan-300 transition-colors duration-300">
            @{request.user.username || 'user'}
          </p>
          {request.message && (
            <p className="text-sm mt-2 italic text-slate-400 line-clamp-2 group-hover:text-cyan-300 transition-colors duration-300">
              "{request.message}"
            </p>
          )}
          <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Sent {new Date(request.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-4">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onCancel(request.id)}
            disabled={actionLoading === request.id}
            className="gap-2 border-cyan-500/30 text-cyan-300 hover:bg-gradient-to-r hover:from-red-500/10 hover:to-pink-500/10 hover:border-red-500/50 hover:text-red-400 transition-all duration-300"
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
    </Card>
  );
}
