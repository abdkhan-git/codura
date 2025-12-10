"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";

interface LoadingContextType {
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const LoadingContext = createContext<LoadingContextType>({
  isLoading: false,
  setIsLoading: () => {},
});

export function useLoading() {
  return useContext(LoadingContext);
}

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Reset loading state when route changes
    setIsLoading(false);

    // Update favicon to normal state
    updateFavicon(false);
  }, [pathname, searchParams]);

  useEffect(() => {
    // Update favicon based on loading state
    updateFavicon(isLoading);
  }, [isLoading]);

  return (
    <LoadingContext.Provider value={{ isLoading, setIsLoading }}>
      {children}
    </LoadingContext.Provider>
  );
}

function updateFavicon(isLoading: boolean) {
  if (typeof window === 'undefined') return;

  const link = document.querySelector("link[rel='icon']") as HTMLLinkElement;
  if (link) {
    if (isLoading) {
      link.classList.add('animate-spin');
    } else {
      link.classList.remove('animate-spin');
    }
  }
}