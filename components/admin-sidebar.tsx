"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn, formatName } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  LayoutDashboard,
  Users,
  Package,
  ClipboardList,
  FileText,
  MessageSquare,
  ScrollText,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  Briefcase,
  FolderKanban,
} from "lucide-react"
import Image from "next/image"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useSidebar } from "@/components/sidebar-context"
import type { UserRole } from "@/types/database"
import { getRoleDisplayName, getRoleBadgeColor } from "@/lib/permissions"

interface AdminSidebarProps {
  user?: {
    email?: string
    user_metadata?: {
      first_name?: string
      last_name?: string
    }
  }
  profile?: {
    first_name?: string
    last_name?: string
    department?: string
    role?: UserRole
    lead_departments?: string[]
  }
}

const adminNavigation = [
  { name: "Admin Dashboard", href: "/admin", icon: LayoutDashboard, roles: ["super_admin", "admin", "lead"] },
  { name: "Staff Management", href: "/admin/staff", icon: Users, roles: ["super_admin", "admin", "lead"] },
  { name: "Asset Management", href: "/admin/assets", icon: Package, roles: ["super_admin", "admin", "lead"] },
  { name: "Project Management", href: "/admin/projects", icon: FolderKanban, roles: ["super_admin", "admin", "lead"] },
  { name: "Task Management", href: "/admin/tasks", icon: ClipboardList, roles: ["super_admin", "admin", "lead"] },
  { name: "Documentation", href: "/admin/documentation", icon: FileText, roles: ["super_admin", "admin", "lead"] },
  { name: "Job Descriptions", href: "/admin/job-descriptions", icon: Briefcase, roles: ["super_admin", "admin"] },
  { name: "Feedback", href: "/admin/feedback", icon: MessageSquare, roles: ["super_admin", "admin", "lead"] },
  { name: "Audit Logs", href: "/admin/audit-logs", icon: ScrollText, roles: ["super_admin", "admin", "lead"] },
]

export function AdminSidebar({ user, profile }: AdminSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { isCollapsed } = useSidebar()
  const supabase = createClient()

  const getInitials = (email?: string, firstName?: string, lastName?: string): string => {
    if (firstName && lastName) {
      return (firstName[0] + lastName[0]).toUpperCase()
    }
    if (!email) return "U"

    const localPart = email.split("@")[0]
    const parts = localPart.split(".")

    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }

    return localPart.substring(0, 2).toUpperCase()
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    toast.success("Logged out successfully")
    router.push("/auth/login")
  }

  const canAccessRoute = (requiredRoles: string[]) => {
    if (!profile?.role) return false
    return requiredRoles.includes(profile.role)
  }

  const filteredNavigation = adminNavigation.filter((item) => canAccessRoute(item.roles))

  const SidebarContent = () => (
    <>
      {/* Empty space for logo (moved to navbar) */}
      <div className={cn("", isCollapsed ? "px-2 py-8" : "px-6 py-8")}>{/* Logo space maintained but empty */}</div>

      {/* Admin Badge & User Profile - Fixed height container */}
      <div
        className={cn(
          "flex min-h-[100px] flex-col border-b py-6 pt-10 transition-all duration-300",
          isCollapsed ? "mx-0 items-center px-0" : "mx-6"
        )}
      >
        {/* Admin Panel Badge - Commented out */}
        {/* <div className={cn("transition-all duration-300 overflow-hidden", isCollapsed ? "max-h-0 opacity-0" : "max-h-10 opacity-100")}>
        <div className="flex items-center gap-2">
          <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
            <ShieldCheck className="h-3 w-3 mr-1" />
            Admin Panel
          </Badge>
        </div>
        </div> */}

        {/* User Profile - Fixed height container */}
        <div
          className={cn(
            "flex flex-shrink-0 items-center transition-all duration-300",
            isCollapsed ? "justify-center" : "gap-3"
          )}
        >
          <Avatar className={cn("ring-primary/10 flex-shrink-0 ring-2 transition-all duration-300", "h-12 w-12")}>
            <AvatarFallback className="bg-primary text-primary-foreground text-lg font-semibold">
              {getInitials(user?.email, profile?.first_name, profile?.last_name)}
            </AvatarFallback>
          </Avatar>
          <div
            className={cn(
              "overflow-hidden transition-all duration-300",
              isCollapsed ? "w-0 max-w-0 opacity-0" : "ml-0 w-auto max-w-full min-w-0 flex-1 opacity-100"
            )}
          >
            <div
              className={cn(
                "overflow-hidden transition-all duration-300",
                isCollapsed ? "max-h-0 opacity-0" : "max-h-24 opacity-100"
              )}
            >
              <p className="text-foreground truncate text-sm font-semibold whitespace-nowrap">
                {profile?.first_name && profile?.last_name
                  ? `${formatName(profile.first_name)} ${formatName(profile.last_name)}`
                  : user?.email?.split("@")[0]}
              </p>
              {profile?.role && (
                <Badge
                  variant="outline"
                  className={cn("mt-1 text-xs whitespace-nowrap", getRoleBadgeColor(profile.role))}
                >
                  {getRoleDisplayName(profile.role)}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Leading Departments - Fixed height container */}
        <div
          className={cn(
            "flex-shrink-0 overflow-hidden transition-all duration-300",
            isCollapsed || !profile?.lead_departments || profile.lead_departments.length === 0
              ? "max-h-0 opacity-0"
              : "max-h-32 opacity-100"
          )}
        >
          <div className="pt-2 text-xs">
            <p className="text-muted-foreground mb-1">Leading:</p>
            <div className="flex flex-wrap gap-1">
              {profile?.lead_departments?.map((dept) => (
                <Badge key={dept} variant="outline" className="text-xs">
                  {dept}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-4 py-6">
        {filteredNavigation.map((item) => {
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname === item.href || pathname?.startsWith(item.href + "/")
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setIsMobileMenuOpen(false)}
              className={cn(
                "flex min-h-[44px] items-center rounded-lg transition-all duration-300",
                isCollapsed ? "justify-center px-3 py-3" : "gap-3 px-4 py-3",
                "text-sm font-medium",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
              title={isCollapsed ? item.name : undefined}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              <span
                className={cn(
                  "overflow-hidden whitespace-nowrap transition-all duration-300",
                  isCollapsed ? "w-0 opacity-0" : "ml-0 w-auto opacity-100"
                )}
              >
                {item.name}
              </span>
            </Link>
          )
        })}
      </nav>

      {/* Back to Dashboard & Logout */}
      <div className="space-y-2 border-t px-4 py-4">
        <Link href="/dashboard">
          <Button
            variant="outline"
            className={cn(
              "text-muted-foreground hover:text-foreground mb-2 min-h-[44px] w-full transition-all duration-300",
              isCollapsed ? "justify-center px-3" : "justify-start gap-3"
            )}
            title={isCollapsed ? "Back to Dashboard" : undefined}
          >
            <LayoutDashboard className="h-5 w-5 flex-shrink-0" />
            <span
              className={cn(
                "overflow-hidden whitespace-nowrap transition-all duration-300",
                isCollapsed ? "w-0 opacity-0" : "ml-0 w-auto opacity-100"
              )}
            >
              Back to Dashboard
            </span>
          </Button>
        </Link>
        <Button
          variant="outline"
          className={cn(
            "text-muted-foreground hover:text-foreground min-h-[44px] w-full transition-all duration-300",
            isCollapsed ? "justify-center px-3" : "justify-start gap-3"
          )}
          onClick={handleLogout}
          title={isCollapsed ? "Logout" : undefined}
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          <span
            className={cn(
              "overflow-hidden whitespace-nowrap transition-all duration-300",
              isCollapsed ? "w-0 opacity-0" : "ml-0 w-auto opacity-100"
            )}
          >
            Logout
          </span>
        </Button>
      </div>
    </>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "bg-card hidden border-r transition-all duration-300 lg:fixed lg:inset-y-0 lg:flex lg:flex-col",
          isCollapsed ? "lg:w-20" : "lg:w-64"
        )}
      >
        <SidebarContent />
      </aside>

      {/* Mobile Header */}
      <div className="bg-card fixed top-0 right-0 left-0 z-40 border-b lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Image src="/acob-logo.webp" alt="ACOB Lighting" width={120} height={120} />
            <Badge className="bg-red-100 text-xs text-red-800 dark:bg-red-900/30 dark:text-red-400">Admin</Badge>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="h-10 w-10"
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>
      </div>

      {/* Mobile Sidebar */}
      <>
        <div
          className={cn(
            "bg-background/80 fixed inset-0 z-40 backdrop-blur-sm transition-opacity duration-300 lg:hidden",
            isMobileMenuOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
          )}
          onClick={() => setIsMobileMenuOpen(false)}
        />
        <aside
          className={cn(
            "bg-card fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r shadow-xl transition-transform duration-300 ease-out lg:hidden",
            isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          {/* Close button for mobile */}
          <div className="flex items-center justify-between border-b px-4 py-3 lg:hidden">
            <div className="flex items-center gap-2">
              <Image src="/acob-logo.webp" alt="ACOB Lighting" width={100} height={100} />
              <Badge className="bg-red-100 text-xs text-red-800 dark:bg-red-900/30 dark:text-red-400">Admin</Badge>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(false)} className="h-8 w-8">
              <X className="h-5 w-5" />
            </Button>
          </div>
          <SidebarContent />
        </aside>
      </>
    </>
  )
}
