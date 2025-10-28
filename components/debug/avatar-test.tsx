"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface AvatarTestProps {
  avatarUrl: string;
  username: string;
  fullName: string;
}

export function AvatarTest({ avatarUrl, username, fullName }: AvatarTestProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [loadTime, setLoadTime] = useState<number | null>(null);

  const handleImageLoad = () => {
    setImageLoaded(true);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoaded(false);
  };

  const testImageLoad = () => {
    const startTime = Date.now();
    setImageLoaded(false);
    setImageError(false);
    
    const img = new Image();
    img.onload = () => {
      setLoadTime(Date.now() - startTime);
      handleImageLoad();
    };
    img.onerror = handleImageError;
    img.src = avatarUrl;
  };

  const getInitials = () => {
    if (!fullName) return username?.[0]?.toUpperCase() || 'U';
    return fullName
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card className="p-4 border-2">
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-xl overflow-hidden">
            {avatarUrl && !imageError ? (
              <img
                src={avatarUrl}
                alt={fullName || username || 'User'}
                className="w-full h-full object-cover"
                onLoad={handleImageLoad}
                onError={handleImageError}
              />
            ) : (
              getInitials()
            )}
          </div>
          <div>
            <h3 className="font-semibold">{fullName || username || 'Anonymous'}</h3>
            <p className="text-sm text-gray-600">@{username}</p>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="text-sm">
            <strong>Avatar URL:</strong> {avatarUrl || 'None'}
          </div>
          <div className="text-sm">
            <strong>Status:</strong> 
            {imageLoaded && <span className="text-green-600 ml-2">✓ Loaded</span>}
            {imageError && <span className="text-red-600 ml-2">✗ Failed to load</span>}
            {!imageLoaded && !imageError && <span className="text-gray-600 ml-2">⏳ Loading...</span>}
          </div>
          {loadTime && (
            <div className="text-sm">
              <strong>Load Time:</strong> {loadTime}ms
            </div>
          )}
          <Button onClick={testImageLoad} size="sm">
            Test Image Load
          </Button>
        </div>
      </div>
    </Card>
  );
}
