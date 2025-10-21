"use client";

import { useState } from "react";
import { Button, ButtonProps } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { startConversation } from "@/lib/messaging-utils";

interface MessageUserButtonProps extends Omit<ButtonProps, "onClick"> {
  userId: string;
  userName?: string;
  showIcon?: boolean;
}

export function MessageUserButton({
  userId,
  userName,
  showIcon = true,
  children,
  className,
  ...props
}: MessageUserButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    setIsLoading(true);
    try {
      await startConversation(userId, userName);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleClick}
      disabled={isLoading}
      className={cn(className)}
      {...props}
    >
      {isLoading ? (
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
      ) : (
        <>
          {showIcon && <MessageSquare className="w-4 h-4 mr-2" />}
          {children || "Message"}
        </>
      )}
    </Button>
  );
}
