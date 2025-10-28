'use client';

import { useState } from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import { MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { getOrCreateDirectConversation } from '@/lib/messaging-api';

interface MessageUserButtonProps extends Omit<ButtonProps, 'onClick'> {
  userId: string;
  userName?: string;
}

export function MessageUserButton({
  userId,
  userName = 'User',
  ...props
}: MessageUserButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleMessage = async () => {
    setIsLoading(true);
    try {
      // Get or create direct message conversation
      const conversationId = await getOrCreateDirectConversation(userId);

      // Navigate to messages page with conversation selected
      router.push(`/messages?conversation=${conversationId}`);
      toast.success(`Opening chat with ${userName}`);
    } catch (error) {
      console.error('Error starting conversation:', error);
      toast.error('Failed to open conversation');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleMessage}
      disabled={isLoading}
      variant="outline"
      size="sm"
      {...props}
    >
      <MessageSquare className="w-4 h-4 mr-2" />
      {isLoading ? 'Opening...' : 'Message'}
    </Button>
  );
}
