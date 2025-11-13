"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { 
  Bell, 
  CheckCheck, 
  X, 
  Search,
  Settings,
  AlertCircle,
  CheckCircle,
  Info,
  User,
  Package,
  MessageSquare,
  FileText,
  AlertTriangle,
  Clock,
  ChevronRight,
  Trash2,
  Archive
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { formatName } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

interface Notification {
  id: string
  user_id: string
  type: string
  category: string
  priority: string
  title: string
  message: string
  rich_content?: any
  link_url?: string
  link_text?: string
  action_buttons?: any
  actor_id?: string
  actor_name?: string
  actor_avatar?: string
  entity_type?: string
  entity_id?: string
  read: boolean
  read_at?: string
  archived: boolean
  clicked: boolean
  created_at: string
  expires_at?: string
}

interface ProfessionalNotificationBellProps {
  isAdmin?: boolean
}

// Notification type icons
const typeIcons = {
  task_assigned: User,
  task_updated: AlertCircle,
  task_completed: CheckCircle,
  mention: MessageSquare,
  feedback: MessageSquare,
  asset_assigned: Package,
  approval_request: FileText,
  approval_granted: CheckCircle,
  system: Settings,
  announcement: AlertTriangle,
}

// Category icons
const categoryIcons = {
  tasks: User,
  assets: Package,
  feedback: MessageSquare,
  approvals: FileText,
  system: Settings,
  mentions: MessageSquare,
}

// Priority colors
const priorityColors = {
  low: "text-gray-500",
  normal: "text-blue-500",
  high: "text-orange-500",
  urgent: "text-red-500",
}

// Format relative time
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (diffInSeconds < 60) return "Just now"
  if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60)
    return `${minutes}m ago`
  }
  if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600)
    return `${hours}h ago`
  }
  if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400)
    return `${days}d ago`
  }
  if (diffInSeconds < 2592000) {
    const weeks = Math.floor(diffInSeconds / 604800)
    return `${weeks}w ago`
  }
  
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

// Get initials from name
function getInitials(name?: string): string {
  if (!name) return "?"
  const parts = name.split(" ")
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  }
  return name.substring(0, 2).toUpperCase()
}

export function ProfessionalNotificationBell({ isAdmin = false }: ProfessionalNotificationBellProps) {
  const router = useRouter()
  const supabase = createClient()
  
  // State
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  
  // Real-time subscription ref
  const subscriptionRef = useRef<any>(null)

  // Load notifications
  const loadNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .eq("archived", false)
        .order("created_at", { ascending: false })
        .limit(50)

      if (error) throw error
      setNotifications(data || [])
    } catch (error: any) {
      console.error("Error loading notifications:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Setup real-time subscription
  useEffect(() => {
    loadNotifications()

    // Subscribe to real-time updates
    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      subscriptionRef.current = supabase
        .channel('notifications')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('Notification change:', payload)
            
            if (payload.eventType === 'INSERT') {
              setNotifications(prev => [payload.new as Notification, ...prev])
              
              // Show toast for new notification
              toast.info(payload.new.title, {
                description: payload.new.message,
                action: payload.new.link_url ? {
                  label: "View",
                  onClick: () => router.push(payload.new.link_url)
                } : undefined
              })
            } else if (payload.eventType === 'UPDATE') {
              setNotifications(prev =>
                prev.map(n => n.id === payload.new.id ? payload.new as Notification : n)
              )
            } else if (payload.eventType === 'DELETE') {
              setNotifications(prev => prev.filter(n => n.id !== payload.old.id))
            }
          }
        )
        .subscribe()
    }

    setupSubscription()

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe()
      }
    }
  }, [supabase, router])

  // Refresh when dropdown opens
  useEffect(() => {
    if (isOpen) {
      loadNotifications()
    }
  }, [isOpen])

  // Mark as read
  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true, read_at: new Date().toISOString() })
        .eq("id", notificationId)

      if (error) throw error

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      )
    } catch (error: any) {
      console.error("Error marking as read:", error)
    }
  }

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase.rpc('mark_notifications_read', {
        p_user_id: user.id,
        p_notification_ids: null
      })

      if (error) throw error

      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      toast.success("All notifications marked as read")
    } catch (error: any) {
      console.error("Error marking all as read:", error)
      toast.error("Failed to mark all as read")
    }
  }

  // Delete notification
  const deleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", notificationId)

      if (error) throw error

      setNotifications(prev => prev.filter(n => n.id !== notificationId))
    } catch (error: any) {
      console.error("Error deleting notification:", error)
      toast.error("Failed to delete notification")
    }
  }

  // Archive notification
  const archiveNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ archived: true, archived_at: new Date().toISOString() })
        .eq("id", notificationId)

      if (error) throw error

      setNotifications(prev => prev.filter(n => n.id !== notificationId))
      toast.success("Notification archived")
    } catch (error: any) {
      console.error("Error archiving notification:", error)
      toast.error("Failed to archive notification")
    }
  }

  // Handle notification click
  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if not already
    if (!notification.read) {
      await markAsRead(notification.id)
    }

    // Update clicked status
    await supabase
      .from("notifications")
      .update({ clicked: true, clicked_at: new Date().toISOString() })
      .eq("id", notification.id)

    // Navigate if there's a link
    if (notification.link_url) {
      setIsOpen(false)
      router.push(notification.link_url)
    }
  }

  // Filter notifications
  const filteredNotifications = notifications.filter(n => {
    // Tab filter
    if (activeTab === "unread" && n.read) return false
    if (activeTab !== "all" && activeTab !== "unread" && n.category !== activeTab) return false

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        n.title.toLowerCase().includes(query) ||
        n.message.toLowerCase().includes(query) ||
        n.actor_name?.toLowerCase().includes(query)
      )
    }

    return true
  })

  // Calculate counts
  const unreadCount = notifications.filter(n => !n.read).length
  const categoryCounts = {
    all: notifications.length,
    unread: unreadCount,
    tasks: notifications.filter(n => n.category === 'tasks').length,
    assets: notifications.filter(n => n.category === 'assets').length,
    feedback: notifications.filter(n => n.category === 'feedback').length,
    approvals: notifications.filter(n => n.category === 'approvals').length,
    mentions: notifications.filter(n => n.category === 'mentions').length,
    system: notifications.filter(n => n.category === 'system').length,
  }

  if (isLoading) {
    return null
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-10 w-10 rounded-full hover:bg-muted transition-colors"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px] font-bold"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent
        align="end"
        className="w-[480px] p-0 shadow-xl border-2"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-foreground" />
            <h3 className="font-semibold text-base">Notifications</h3>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs font-semibold px-2">
                {unreadCount} new
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={markAllAsRead}
              >
                <CheckCheck className="h-4 w-4 mr-1" />
                Mark all read
              </Button>
            )}
            
            <Link href={isAdmin ? "/admin/notification" : "/notification"}>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setIsOpen(false)}
              >
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Search */}
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0 h-auto">
            <TabsTrigger 
              value="all" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3"
            >
              All {categoryCounts.all > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs px-1.5">
                  {categoryCounts.all}
                </Badge>
              )}
            </TabsTrigger>
            
            <TabsTrigger 
              value="unread"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3"
            >
              Unread {categoryCounts.unread > 0 && (
                <Badge variant="destructive" className="ml-2 text-xs px-1.5">
                  {categoryCounts.unread}
                </Badge>
              )}
            </TabsTrigger>
            
            {categoryCounts.mentions > 0 && (
              <TabsTrigger 
                value="mentions"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3"
              >
                <MessageSquare className="h-4 w-4 mr-1" />
                Mentions {categoryCounts.mentions > 0 && (
                  <Badge variant="secondary" className="ml-2 text-xs px-1.5">
                    {categoryCounts.mentions}
                  </Badge>
                )}
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value={activeTab} className="mt-0">
            <ScrollArea className="h-[500px]">
              {filteredNotifications.length > 0 ? (
                <div className="divide-y">
                  {filteredNotifications.map((notification) => {
                    const Icon = typeIcons[notification.type as keyof typeof typeIcons] || Info
                    
                    return (
                      <div
                        key={notification.id}
                        className={cn(
                          "group relative p-4 hover:bg-muted/30 transition-all cursor-pointer",
                          !notification.read && "bg-blue-50/30 dark:bg-blue-950/10"
                        )}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        {/* Unread indicator */}
                        {!notification.read && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                        )}

                        <div className="flex gap-3 pl-2">
                          {/* Actor Avatar or Icon */}
                          {notification.actor_avatar || notification.actor_name ? (
                            <Avatar className="h-10 w-10 shrink-0">
                              {notification.actor_avatar && (
                                <AvatarImage src={notification.actor_avatar} alt={notification.actor_name} />
                              )}
                              <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                                {getInitials(notification.actor_name)}
                              </AvatarFallback>
                            </Avatar>
                          ) : (
                            <div className={cn(
                              "h-10 w-10 rounded-full flex items-center justify-center shrink-0",
                              "bg-muted",
                              priorityColors[notification.priority as keyof typeof priorityColors]
                            )}>
                              <Icon className="h-5 w-5" />
                            </div>
                          )}

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <p className={cn(
                                  "text-sm leading-snug",
                                  !notification.read && "font-semibold"
                                )}>
                                  {notification.title}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                  {notification.message}
                                </p>
                                
                                {/* Link indicator */}
                                {notification.link_url && (
                                  <div className="flex items-center gap-1 mt-1 text-xs text-primary font-medium">
                                    View details
                                    <ChevronRight className="h-3 w-3" />
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                  {formatRelativeTime(notification.created_at)}
                                </span>
                              </div>
                            </div>

                            {/* Action buttons (hidden, show on hover) */}
                            <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              {!notification.read && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs px-2"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    markAsRead(notification.id)
                                  }}
                                >
                                  <CheckCheck className="h-3 w-3 mr-1" />
                                  Mark read
                                </Button>
                              )}
                              
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs px-2"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  archiveNotification(notification.id)
                                }}
                              >
                                <Archive className="h-3 w-3 mr-1" />
                                Archive
                              </Button>
                              
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  deleteNotification(notification.id)
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 px-4">
                  <div className="p-4 rounded-full bg-muted mb-4">
                    <Bell className="h-12 w-12 text-muted-foreground opacity-50" />
                  </div>
                  <p className="text-sm font-semibold text-foreground mb-1">
                    {searchQuery ? "No matching notifications" : "No notifications"}
                  </p>
                  <p className="text-xs text-muted-foreground text-center max-w-sm">
                    {searchQuery 
                      ? "Try adjusting your search terms"
                      : "You're all caught up! We'll notify you when something important happens."
                    }
                  </p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <DropdownMenuSeparator className="my-0" />
        <div className="p-3 bg-muted/20">
          <Link
            href={isAdmin ? "/admin/notification" : "/notification"}
            onClick={() => setIsOpen(false)}
            className="text-xs text-center text-primary hover:underline font-medium block w-full py-1"
          >
            View all notifications →
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

