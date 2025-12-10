"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

export function ModeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  // Ensure component is mounted before rendering to avoid hydration mismatch
  React.useEffect(() => {
    setMounted(true)
  }, [])

  const handleThemeChange = (newTheme: string) => {
    // Update localStorage immediately
    localStorage.setItem('codura-theme', newTheme)
    // Then update the theme
    setTheme(newTheme)
    // Force a re-render by updating the document class
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  if (!mounted) {
    return (
      <Button variant="outline" size="icon" className="rounded-xl border border-border/50 bg-background/50 backdrop-blur-sm shadow-sm">
        <Sun className="h-[1.2rem] w-[1.2rem]" />
        <span className="sr-only">Toggle theme</span>
      </Button>
    )
  }

  const currentTheme = resolvedTheme || theme

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="rounded-xl border border-border/50 bg-background/50 backdrop-blur-sm hover:bg-background/80 hover:border-border transition-all duration-200 shadow-sm">
          <Sun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="rounded-xl border border-border/50 bg-background/80 backdrop-blur-sm shadow-lg">
        <DropdownMenuItem 
          onClick={() => handleThemeChange("light")} 
          className={`rounded-lg hover:bg-muted/50 flex items-center gap-2 ${currentTheme === "light" ? "bg-muted/30" : ""}`}
        >
          <Sun className="h-4 w-4" />
          Light
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleThemeChange("dark")} 
          className={`rounded-lg hover:bg-muted/50 flex items-center gap-2 ${currentTheme === "dark" ? "bg-muted/30" : ""}`}
        >
          <Moon className="h-4 w-4" />
          Dark
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
