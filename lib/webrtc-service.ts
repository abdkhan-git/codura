/**
 * WebRTC Service for Mock Interview Video Calls
 * Handles peer-to-peer video connections using WebRTC
 */

interface SignalingMessage {
  type: "offer" | "answer" | "ice-candidate" | "join" | "leave";
  sessionId: string;
  userId: string;
  data?: any;
}

export class WebRTCService {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private signalingChannel: WebSocket | null = null;
  private sessionId: string;
  private userId: string;
  private isHost: boolean;

  // Callbacks
  private onRemoteStreamCallback: ((stream: MediaStream) => void) | null = null;
  private onConnectionStateCallback: ((state: RTCPeerConnectionState) => void) | null = null;
  private onPartnerJoinedCallback: ((partnerInfo: any) => void) | null = null;

  // ICE Configuration
  private iceConfiguration: RTCConfiguration = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:19302" },
      { urls: "stun:stun3.l.google.com:19302" },
      { urls: "stun:stun4.l.google.com:19302" },
    ],
  };

  constructor(sessionId: string, userId: string, isHost: boolean) {
    this.sessionId = sessionId;
    this.userId = userId;
    this.isHost = isHost;
  }

  /**
   * Initialize the WebRTC connection
   */
  async initialize(localStream: MediaStream): Promise<void> {
    this.localStream = localStream;
    this.setupPeerConnection();
    await this.connectSignaling();
  }

  /**
   * Setup RTCPeerConnection
   */
  private setupPeerConnection(): void {
    this.peerConnection = new RTCPeerConnection(this.iceConfiguration);

    // Add local stream tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        this.peerConnection?.addTrack(track, this.localStream!);
      });
    }

    // Handle incoming tracks
    this.peerConnection.ontrack = (event) => {
      console.log("Received remote track:", event.track.kind);
      const [stream] = event.streams;
      this.remoteStream = stream;
      if (this.onRemoteStreamCallback) {
        this.onRemoteStreamCallback(stream);
      }
    };

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignalingMessage({
          type: "ice-candidate",
          sessionId: this.sessionId,
          userId: this.userId,
          data: event.candidate,
        });
      }
    };

    // Monitor connection state
    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState;
      console.log("Connection state:", state);
      if (this.onConnectionStateCallback && state) {
        this.onConnectionStateCallback(state);
      }
    };

    // Handle ICE connection state
    this.peerConnection.oniceconnectionstatechange = () => {
      console.log("ICE connection state:", this.peerConnection?.iceConnectionState);
    };
  }

  /**
   * Connect to signaling server
   * In production, replace with your WebSocket server URL
   */
  private async connectSignaling(): Promise<void> {
    try {
      // For production, use environment variable for WebSocket URL
      // const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001";

      // For now, we'll use Supabase Realtime as signaling
      // This is a simplified version - you should implement proper signaling

      console.log("Setting up signaling for session:", this.sessionId);

      // Join session
      this.sendSignalingMessage({
        type: "join",
        sessionId: this.sessionId,
        userId: this.userId,
      });

      // If host, wait for peer to join
      // If peer, initiate connection
      if (!this.isHost) {
        await this.createOffer();
      }
    } catch (error) {
      console.error("Failed to connect signaling:", error);
      throw error;
    }
  }

  /**
   * Create and send offer (for joining peer)
   */
  private async createOffer(): Promise<void> {
    if (!this.peerConnection) return;

    try {
      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });

      await this.peerConnection.setLocalDescription(offer);

      this.sendSignalingMessage({
        type: "offer",
        sessionId: this.sessionId,
        userId: this.userId,
        data: offer,
      });
    } catch (error) {
      console.error("Error creating offer:", error);
      throw error;
    }
  }

  /**
   * Handle received offer (for host)
   */
  async handleOffer(offer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection) return;

    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);

      this.sendSignalingMessage({
        type: "answer",
        sessionId: this.sessionId,
        userId: this.userId,
        data: answer,
      });
    } catch (error) {
      console.error("Error handling offer:", error);
      throw error;
    }
  }

  /**
   * Handle received answer (for joining peer)
   */
  async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection) return;

    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (error) {
      console.error("Error handling answer:", error);
      throw error;
    }
  }

  /**
   * Handle received ICE candidate
   */
  async handleIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.peerConnection) return;

    try {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error("Error adding ICE candidate:", error);
    }
  }

  /**
   * Send signaling message
   * In production, this should send via WebSocket or Supabase Realtime
   */
  private sendSignalingMessage(message: SignalingMessage): void {
    // In production, implement actual signaling
    // For now, log to console
    console.log("Signaling message:", message);

    // Example implementation with WebSocket:
    // if (this.signalingChannel?.readyState === WebSocket.OPEN) {
    //   this.signalingChannel.send(JSON.stringify(message));
    // }

    // Example implementation with Supabase:
    // await supabase
    //   .from('signaling_messages')
    //   .insert({ session_id: this.sessionId, message });
  }

  /**
   * Replace video track (for screen sharing)
   */
  async replaceVideoTrack(newTrack: MediaStreamTrack): Promise<void> {
    if (!this.peerConnection) return;

    const sender = this.peerConnection
      .getSenders()
      .find((s) => s.track?.kind === "video");

    if (sender) {
      await sender.replaceTrack(newTrack);
    }
  }

  /**
   * Toggle local video
   */
  toggleVideo(enabled: boolean): void {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach((track) => {
        track.enabled = enabled;
      });
    }
  }

  /**
   * Toggle local audio
   */
  toggleAudio(enabled: boolean): void {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = enabled;
      });
    }
  }

  /**
   * Set callback for remote stream
   */
  onRemoteStream(callback: (stream: MediaStream) => void): void {
    this.onRemoteStreamCallback = callback;
  }

  /**
   * Set callback for connection state changes
   */
  onConnectionState(callback: (state: RTCPeerConnectionState) => void): void {
    this.onConnectionStateCallback = callback;
  }

  /**
   * Set callback for partner joined
   */
  onPartnerJoined(callback: (partnerInfo: any) => void): void {
    this.onPartnerJoinedCallback = callback;
  }

  /**
   * Get connection statistics
   */
  async getStats(): Promise<RTCStatsReport | null> {
    if (!this.peerConnection) return null;
    return await this.peerConnection.getStats();
  }

  /**
   * Cleanup and close connection
   */
  cleanup(): void {
    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
    }

    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    // Close signaling channel
    if (this.signalingChannel) {
      this.signalingChannel.close();
      this.signalingChannel = null;
    }

    // Send leave message
    this.sendSignalingMessage({
      type: "leave",
      sessionId: this.sessionId,
      userId: this.userId,
    });
  }
}

/**
 * Helper function to create media constraints
 */
export function createMediaConstraints(options?: {
  videoDeviceId?: string;
  audioDeviceId?: string;
  quality?: "low" | "medium" | "high";
}): MediaStreamConstraints {
  const quality = options?.quality || "high";

  const videoConstraints: MediaTrackConstraints = {
    deviceId: options?.videoDeviceId ? { exact: options.videoDeviceId } : undefined,
    width: quality === "high" ? { ideal: 1280 } : quality === "medium" ? { ideal: 640 } : { ideal: 320 },
    height: quality === "high" ? { ideal: 720 } : quality === "medium" ? { ideal: 480 } : { ideal: 240 },
    frameRate: quality === "high" ? { ideal: 30 } : { ideal: 24 },
  };

  const audioConstraints: MediaTrackConstraints = {
    deviceId: options?.audioDeviceId ? { exact: options.audioDeviceId } : undefined,
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  };

  return {
    video: videoConstraints,
    audio: audioConstraints,
  };
}
