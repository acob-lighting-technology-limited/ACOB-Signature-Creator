"use client"

import { useSidebar } from "./sidebar-context"
import { cn } from "@/lib/utils"

export function SidebarContent({ children }: { children: React.ReactNode }) {
  const { isCollapsed } = useSidebar()

  return (
    <main
      className={cn(
        "flex-1 transition-all duration-300",
        isCollapsed ? "lg:pl-20" : "lg:pl-64",
        "pt-16" // Padding top for fixed navbar (h-16 = 64px)
      )}
    >
      {children}
    </main>
  )
}
