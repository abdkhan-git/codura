"use client";

import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, Square, Play } from "lucide-react";
import { toast } from "sonner";

/**
 * Audio Test Component - Record yourself and play it back
 * Add this to waiting room to test full audio pipeline
 */
export function AudioTestPlayback() {
  const [isRecording, setIsRecording] = useState(false);
  const [hasRecording, setHasRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setHasRecording(true);

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast.success("Recording... Speak now!");
    } catch (error) {
      console.error("Error recording:", error);
      toast.error("Failed to start recording");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      toast.success("Recording stopped. Click Play to hear yourself!");
    }
  };

  const playRecording = () => {
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.play();
      toast.success("Playing your recording...");
    }
  };

  return (
    <Card className="border-border/20 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-sm">Audio Test (Hear Yourself)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Record your voice and play it back to test microphone + speakers
        </p>

        <div className="flex gap-2">
          {!isRecording ? (
            <Button
              size="sm"
              onClick={startRecording}
              className="flex-1 gap-2"
              variant="outline"
            >
              <Mic className="w-4 h-4" />
              Record Audio
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={stopRecording}
              className="flex-1 gap-2"
              variant="destructive"
            >
              <Square className="w-4 h-4" />
              Stop Recording
            </Button>
          )}

          {hasRecording && (
            <Button
              size="sm"
              onClick={playRecording}
              className="flex-1 gap-2"
              variant="default"
            >
              <Play className="w-4 h-4" />
              Play Back
            </Button>
          )}
        </div>

        {isRecording && (
          <div className="text-center p-2 bg-red-500/10 rounded-lg">
            <p className="text-xs text-red-600 font-medium animate-pulse">
              🔴 Recording... Say "Testing 1, 2, 3"
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
