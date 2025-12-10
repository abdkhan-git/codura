"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
    
    // Ensure theme is properly initialized from localStorage
    const savedTheme = localStorage.getItem('codura-theme')
    if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
      // Theme is already set, no need to do anything
    } else {
      // Set default theme if none exists
      localStorage.setItem('codura-theme', 'dark')
    }
  }, [])

  if (!mounted) {
    return <>{children}</>
  }

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange={true}
      storageKey="codura-theme"
      themes={["light", "dark"]}
      enableColorScheme={true}
      {...props}
    >
      {children}
    </NextThemesProvider>
  )
}