import Image from "next/image";
import CoduraLogo from "@/components/logos/codura-logo.svg";

export function LoadingSpinner({ size = "default" }: { size?: "small" | "default" | "large" }) {
  const sizeClasses = {
    small: "w-12 h-12",
    default: "w-20 h-20",
    large: "w-32 h-32"
  };

  return (
    <div className="flex items-center justify-center">
      <div className={`${sizeClasses[size]} animate-spin`}>
        <Image
          src={CoduraLogo}
          alt="Loading..."
          width={size === "small" ? 48 : size === "default" ? 80 : 128}
          height={size === "small" ? 48 : size === "default" ? 80 : 128}
          priority
        />
      </div>
    </div>
  );
}

export function LoadingScreen() {
  return (
    <div className="caffeine-theme min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="text-center">
        <LoadingSpinner size="large" />
        <p className="text-muted-foreground mt-4 animate-pulse">Loading...</p>
      </div>
    </div>
  );
}

export function LoadingCard() {
  return (
    <div className="relative border-2 border-border/20 bg-gradient-to-br from-card/50 via-card/30 to-transparent backdrop-blur-xl overflow-hidden shadow-xl rounded-lg p-8">
      <div className="text-center">
        <LoadingSpinner />
        <p className="text-muted-foreground mt-4 text-sm animate-pulse">Loading...</p>
      </div>
    </div>
  );
}