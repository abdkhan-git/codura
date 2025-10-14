"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function FaviconAnimation() {
  const pathname = usePathname();

  useEffect(() => {
    let animationFrameId: number;
    let rotation = 0;
    let isAnimating = false;
    let animationTimeout: NodeJS.Timeout;

    const animateFavicon = () => {
      if (!isAnimating) return;

      const canvas = document.createElement('canvas');
      canvas.width = 32;
      canvas.height = 32;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        // Clear canvas
        ctx.clearRect(0, 0, 32, 32);

        // Save context
        ctx.save();

        // Move to center and rotate
        ctx.translate(16, 16);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.translate(-16, -16);

        // Draw a simple loading indicator (circle with a gap)
        ctx.beginPath();
        ctx.arc(16, 16, 12, 0, 1.5 * Math.PI);
        ctx.strokeStyle = '#f97316'; // brand color
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Restore context
        ctx.restore();

        // Update favicon
        const link = document.querySelector("link[rel='icon']") as HTMLLinkElement;
        if (link) {
          link.href = canvas.toDataURL();
        }

        // Increment rotation
        rotation += 10;
        if (rotation >= 360) rotation = 0;
      }

      animationFrameId = requestAnimationFrame(animateFavicon);
    };

    const startAnimation = () => {
      isAnimating = true;
      animateFavicon();
    };

    const stopAnimation = () => {
      isAnimating = false;
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }

      // Reset favicon to original
      const link = document.querySelector("link[rel='icon']") as HTMLLinkElement;
      if (link) {
        link.href = '/favicon.ico';
      }
    };

    // Start animation when pathname changes
    startAnimation();

    // Stop animation after a delay
    animationTimeout = setTimeout(() => {
      stopAnimation();
    }, 1000); // Stop after 1 second

    return () => {
      stopAnimation();
      clearTimeout(animationTimeout);
    };
  }, [pathname]);

  return null;
}