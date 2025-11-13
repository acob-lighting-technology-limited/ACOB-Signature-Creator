"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  Bell,
  AlertCircle,
  CheckCircle,
  Info,
  Search,
  CheckCheck,
  ArrowLeft,
  User,
  Package,
  MessageSquare,
  FileText,
  Settings,
  AlertTriangle,
  Trash2,
  Archive,
  ChevronRight,
  Filter,
} from "lucide-react"
import Link from "next/link"

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

// Type icons
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
    return `${minutes} minute${minutes > 1 ? "s" : ""} ago`
  }
  if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600)
    return `${hours} hour${hours > 1 ? "s" : ""} ago`
  }
  if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400)
    return `${days} day${days > 1 ? "s" : ""} ago`
  }
  
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

// Get initials
function getInitials(name?: string): string {
  if (!name) return "?"
  const parts = name.split(" ")
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  }
  return name.substring(0, 2).toUpperCase()
}

export default function NotificationPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [priorityFilter, setPriorityFilter] = useState("all")

  // Load notifications
  const loadNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push("/auth/login")
        return
      }

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .eq("archived", false)
        .order("created_at", { ascending: false })

      if (error) throw error
      setNotifications(data || [])
    } catch (error: any) {
      console.error("Error loading notifications:", error)
      toast.error("Failed to load notifications")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadNotifications()

    // Setup real-time subscription
    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const subscription = supabase
        .channel('user_notifications')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              setNotifications(prev => [payload.new as Notification, ...prev])
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

      return () => {
        subscription.unsubscribe()
      }
    }

    setupSubscription()
  }, [supabase, router])

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
      toast.error("Failed to mark as read")
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
      console.error("Error:", error)
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
      toast.success("Notification deleted")
    } catch (error: any) {
      console.error("Error:", error)
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
      console.error("Error:", error)
      toast.error("Failed to archive notification")
    }
  }

  // Handle notification click
  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await markAsRead(notification.id)
    }

    await supabase
      .from("notifications")
      .update({ clicked: true, clicked_at: new Date().toISOString() })
      .eq("id", notification.id)

    if (notification.link_url) {
      router.push(notification.link_url)
    }
  }

  // Filter notifications
  const filteredNotifications = notifications.filter(n => {
    // Tab filter
    if (activeTab === "unread" && n.read) return false
    if (activeTab !== "all" && activeTab !== "unread" && n.category !== activeTab) return false

    // Priority filter
    if (priorityFilter !== "all" && n.priority !== priorityFilter) return false

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
    mentions: notifications.filter(n => n.category === 'mentions').length,
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-5xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
                <Bell className="h-7 w-7" />
                Notifications
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Stay updated with your tasks, assets, and more
              </p>
            </div>
          </div>

          {unreadCount > 0 && (
            <Button onClick={markAllAsRead} variant="outline" className="gap-2">
              <CheckCheck className="h-4 w-4" />
              Mark all read
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{categoryCounts.all}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{categoryCounts.unread}</div>
              <div className="text-xs text-muted-foreground">Unread</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{categoryCounts.tasks}</div>
              <div className="text-xs text-muted-foreground">Tasks</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-purple-600">{categoryCounts.assets}</div>
              <div className="text-xs text-muted-foreground">Assets</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Card>
          <CardHeader className="border-b">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search notifications..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="border-b">
              <TabsList className="w-full justify-start rounded-none border-b-0 bg-transparent p-0 h-auto">
                <TabsTrigger 
                  value="all" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3"
                >
                  All
                  {categoryCounts.all > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {categoryCounts.all}
                    </Badge>
                  )}
                </TabsTrigger>
                
                <TabsTrigger 
                  value="unread"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3"
                >
                  Unread
                  {categoryCounts.unread > 0 && (
                    <Badge variant="destructive" className="ml-2">
                      {categoryCounts.unread}
                    </Badge>
                  )}
                </TabsTrigger>
                
                <TabsTrigger 
                  value="tasks"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3"
                >
                  <User className="h-4 w-4 mr-1" />
                  Tasks
                  {categoryCounts.tasks > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {categoryCounts.tasks}
                    </Badge>
                  )}
                </TabsTrigger>
                
                <TabsTrigger 
                  value="assets"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3"
                >
                  <Package className="h-4 w-4 mr-1" />
                  Assets
                  {categoryCounts.assets > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {categoryCounts.assets}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value={activeTab} className="mt-0">
              <ScrollArea className="h-[calc(100vh-400px)]">
                {filteredNotifications.length > 0 ? (
                  <div className="divide-y">
                    {filteredNotifications.map((notification) => {
                      const Icon = typeIcons[notification.type as keyof typeof typeIcons] || Info
                      
                      return (
                        <div
                          key={notification.id}
                          className={cn(
                            "group relative p-6 hover:bg-muted/30 transition-all cursor-pointer",
                            !notification.read && "bg-blue-50/30 dark:bg-blue-950/10"
                          )}
                          onClick={() => handleNotificationClick(notification)}
                        >
                          {!notification.read && (
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                          )}

                          <div className="flex gap-4 pl-2">
                            {notification.actor_avatar || notification.actor_name ? (
                              <Avatar className="h-12 w-12 shrink-0">
                                {notification.actor_avatar && (
                                  <AvatarImage src={notification.actor_avatar} alt={notification.actor_name} />
                                )}
                                <AvatarFallback className="bg-primary/10 text-primary font-medium">
                                  {getInitials(notification.actor_name)}
                                </AvatarFallback>
                              </Avatar>
                            ) : (
                              <div className={cn(
                                "h-12 w-12 rounded-full flex items-center justify-center shrink-0 bg-muted",
                                priorityColors[notification.priority as keyof typeof priorityColors]
                              )}>
                                <Icon className="h-6 w-6" />
                              </div>
                            )}

                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <h3 className={cn(
                                    "text-base leading-snug",
                                    !notification.read && "font-semibold"
                                  )}>
                                    {notification.title}
                                  </h3>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {notification.message}
                                  </p>
                                  
                                  <div className="flex items-center gap-4 mt-2">
                                    <span className="text-xs text-muted-foreground">
                                      {formatRelativeTime(notification.created_at)}
                                    </span>
                                    {notification.actor_name && (
                                      <>
                                        <span className="text-muted-foreground">•</span>
                                        <span className="text-xs text-muted-foreground">
                                          by {notification.actor_name}
                                        </span>
                                      </>
                                    )}
                                    <Badge variant="outline" className="text-xs">
                                      {notification.category}
                                    </Badge>
                                  </div>

                                  {notification.link_url && (
                                    <div className="flex items-center gap-1 mt-2 text-sm text-primary font-medium">
                                      View details
                                      <ChevronRight className="h-4 w-4" />
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="flex items-center gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                {!notification.read && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      markAsRead(notification.id)
                                    }}
                                  >
                                    <CheckCheck className="h-4 w-4 mr-1" />
                                    Mark read
                                  </Button>
                                )}
                                
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    archiveNotification(notification.id)
                                  }}
                                >
                                  <Archive className="h-4 w-4 mr-1" />
                                  Archive
                                </Button>
                                
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    deleteNotification(notification.id)
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  Delete
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
                    <div className="p-6 rounded-full bg-muted mb-4">
                      <Bell className="h-16 w-16 text-muted-foreground opacity-50" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">
                      {searchQuery ? "No matching notifications" : "No notifications"}
                    </h3>
                    <p className="text-sm text-muted-foreground text-center max-w-md">
                      {searchQuery 
                        ? "Try adjusting your search terms or filters"
                        : "You're all caught up! We'll notify you when something important happens."
                      }
                    </p>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  )
}
