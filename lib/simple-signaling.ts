/**
 * Simple Signaling System using Supabase Realtime
 * This allows WebRTC peers to exchange connection information
 */

import { createClient } from "@/utils/supabase/client";

export interface SignalingMessage {
  type: "offer" | "answer" | "ice-candidate" | "user-joined" | "user-left";
  from: string;
  to?: string;
  sessionId: string;
  data?: any;
  timestamp: number;
}

export class SimpleSignaling {
  private supabase = createClient();
  private sessionId: string;
  private userId: string;
  private channel: any = null;
  private messageCallback: ((message: SignalingMessage) => void) | null = null;

  constructor(sessionId: string, userId: string) {
    this.sessionId = sessionId;
    this.userId = userId;
  }

  /**
   * Connect to signaling channel
   */
  async connect(initialData?: Record<string, any>) {
    try {
      // Subscribe to session channel
      this.channel = this.supabase.channel(`mock-interview:${this.sessionId}`);

      // Listen for broadcast messages
      this.channel
        .on("broadcast", { event: "signaling" }, ({ payload }: { payload: SignalingMessage }) => {
          console.log(`[Signaling] Received message:`, {
            type: payload.type,
            from: payload.from,
            to: payload.to,
            forMe: !payload.to || payload.to === this.userId,
            myId: this.userId
          });

          // Only process messages meant for us or broadcast to all
          if (!payload.to || payload.to === this.userId) {
            if (this.messageCallback) {
              this.messageCallback(payload);
            } else {
              console.warn(`[Signaling] No message callback set, dropping message`);
            }
          } else {
            console.log(`[Signaling] Message not for me, ignoring`);
          }
        })
        .subscribe((status: string) => {
          console.log(`[Signaling] Channel status: ${status} for session ${this.sessionId}`);
          if (status === "SUBSCRIBED") {
            console.log(`[Signaling] Successfully subscribed, announcing presence`);
            // Announce presence
            this.send({
              type: "user-joined",
              from: this.userId,
              sessionId: this.sessionId,
              timestamp: Date.now(),
              data: initialData,
            });
          }
        });

      return true;
    } catch (error) {
      console.error("Error connecting to signaling:", error);
      return false;
    }
  }

  /**
   * Send signaling message
   */
  async send(message: Partial<SignalingMessage>) {
    if (!this.channel) {
      console.error("[Signaling] Channel not connected");
      return false;
    }

    const fullMessage: SignalingMessage = {
      from: this.userId,
      sessionId: this.sessionId,
      timestamp: Date.now(),
      ...message,
    } as SignalingMessage;

    console.log(`[Signaling] Sending message:`, {
      type: fullMessage.type,
      from: fullMessage.from,
      to: fullMessage.to || 'broadcast',
    });

    try {
      await this.channel.send({
        type: "broadcast",
        event: "signaling",
        payload: fullMessage,
      });
      console.log(`[Signaling] Message sent successfully`);
      return true;
    } catch (error) {
      console.error("[Signaling] Error sending message:", error);
      return false;
    }
  }

  /**
   * Set callback for incoming messages
   */
  onMessage(callback: (message: SignalingMessage) => void) {
    this.messageCallback = callback;
  }

  /**
   * Disconnect from signaling
   */
  async disconnect() {
    if (this.channel) {
      // Announce leaving
      await this.send({
        type: "user-left",
        from: this.userId,
        sessionId: this.sessionId,
        timestamp: Date.now(),
      });

      this.supabase.removeChannel(this.channel);
      this.channel = null;
    }
  }
}
