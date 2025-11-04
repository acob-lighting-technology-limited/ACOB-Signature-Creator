import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import {
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Building2,
  Calendar,
  MessageSquare,
  FileSignature,
  Droplet,
  ArrowRight,
  Clock,
} from "lucide-react"

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data } = await supabase.auth.getUser()
  const userId = data?.user?.id

  // Fetch user profile
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).single()

  // Fetch user's recent feedbacks
  const { data: feedbacks } = await supabase
    .from("feedback")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(5)

  const getInitials = (firstName?: string, lastName?: string, email?: string): string => {
    if (firstName && lastName) {
      return (firstName[0] + lastName[0]).toUpperCase()
    }
    if (email) {
      const localPart = email.split("@")[0]
      const parts = localPart.split(".")
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase()
      }
      return localPart.substring(0, 2).toUpperCase()
    }
    return "U"
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "resolved":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
      case "in_progress":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
    }
  }

  const quickActions = [
    {
      name: "Email Signature",
      href: "/signature",
      icon: FileSignature,
      description: "Create professional signature",
      color: "bg-blue-500",
    },
    {
      name: "Submit Feedback",
      href: "/feedback",
      icon: MessageSquare,
      description: "Share your thoughts",
      color: "bg-green-500",
    },
    {
      name: "Watermark Tool",
      href: "/watermark",
      icon: Droplet,
      description: "Add watermarks",
      color: "bg-purple-500",
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="mx-auto max-w-7xl p-4 md:p-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">
            Welcome back, {profile?.first_name || "Staff Member"}!
          </h1>
          <p className="mt-2 text-muted-foreground">Here's what's happening with your account today.</p>
        </div>

        {/* User Info Card */}
        <Card className="border-2 shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-background p-6 md:p-8">
            <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
              <Avatar className="h-20 w-20 ring-4 ring-background shadow-xl">
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
                  {getInitials(profile?.first_name, profile?.last_name, data?.user?.email)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-4">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">
                    {profile?.first_name} {profile?.last_name}
                    {profile?.other_names && ` ${profile.other_names}`}
                  </h2>
                  <p className="text-muted-foreground">{profile?.company_role || "Staff Member"}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">{profile?.company_email || data?.user?.email}</span>
                  </div>
                  {profile?.phone_number && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-foreground">{profile.phone_number}</span>
                    </div>
                  )}
                  {profile?.department && (
                    <div className="flex items-center gap-2 text-sm">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-foreground">{profile.department}</span>
                    </div>
                  )}
                  {profile?.current_work_location && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-foreground">{profile.current_work_location}</span>
                    </div>
                  )}
                </div>
              </div>
              <Link href="/profile">
                <Button variant="outline" className="gap-2">
                  <User className="h-4 w-4" />
                  Edit Profile
                </Button>
              </Link>
            </div>
          </div>
        </Card>

        {/* Quick Actions */}
        <div>
          <h3 className="text-xl font-semibold mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {quickActions.map((action) => (
              <Link key={action.name} href={action.href}>
                <Card className="group hover:shadow-lg transition-all duration-200 hover:-translate-y-1 cursor-pointer border-2 hover:border-primary">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className={`${action.color} p-3 rounded-lg text-white`}>
                        <action.icon className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                          {action.name}
                        </h4>
                        <p className="text-sm text-muted-foreground mt-1">{action.description}</p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Feedbacks */}
        <Card className="border-2 shadow-lg">
          <CardHeader className="border-b bg-muted/30">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Recent Feedback
              </CardTitle>
              <Link href="/feedback">
                <Button variant="ghost" size="sm" className="gap-2">
                  View All
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {feedbacks && feedbacks.length > 0 ? (
              <div className="space-y-4">
                {feedbacks.map((feedback) => (
                  <div
                    key={feedback.id}
                    className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(feedback.status)}>
                            {feedback.status?.replace("_", " ") || "Pending"}
                          </Badge>
                          <Badge variant="outline">{feedback.category}</Badge>
                        </div>
                        <h4 className="font-semibold text-foreground">{feedback.title}</h4>
                        <p className="text-sm text-muted-foreground line-clamp-2">{feedback.description}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDate(feedback.created_at)}
                          </div>
                          {feedback.priority && (
                            <span className="font-medium text-orange-600 dark:text-orange-400">
                              {feedback.priority} priority
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No feedback yet</h3>
                <p className="text-muted-foreground mb-4">Start by submitting your first feedback</p>
                <Link href="/feedback">
                  <Button className="gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Submit Feedback
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-2">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Total Feedback</p>
                  <p className="text-3xl font-bold text-foreground mt-2">{feedbacks?.length || 0}</p>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <MessageSquare className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-2">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Department</p>
                  <p className="text-2xl font-bold text-foreground mt-2">{profile?.department || "N/A"}</p>
                </div>
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Building2 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-2">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Work Location</p>
                  <p className="text-2xl font-bold text-foreground mt-2">
                    {profile?.current_work_location || "N/A"}
                  </p>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <MapPin className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
