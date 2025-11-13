import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { FeedbackViewerClient } from "@/components/feedback-viewer-client"
import { MessageSquare, AlertCircle, Clock, CheckCircle, XCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default async function AdminFeedbackPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  // Check if user is admin or lead
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, lead_departments")
    .eq("id", data.user.id)
    .single()

  if (!profile || !["super_admin", "admin", "lead"].includes(profile.role)) {
    redirect("/dashboard")
  }

  // Fetch feedback - RLS will filter by department for leads
  const { data: feedbackData, error: feedbackError } = await supabase
    .from("feedback")
    .select("*")
    .order("created_at", { ascending: false })

  if (feedbackError) {
    console.error("Error fetching feedback:", feedbackError)
  }

  // Fetch profiles for all user_ids in feedback
  let feedbackWithProfiles = feedbackData || []
  if (feedbackData && feedbackData.length > 0) {
    const userIds = Array.from(new Set(feedbackData.map((f) => f.user_id).filter(Boolean)))

    if (userIds.length > 0) {
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, company_email, department")
        .in("id", userIds)

      if (profilesError) {
        console.error("Error fetching profiles:", profilesError)
      }

      // Merge profiles with feedback
      feedbackWithProfiles = feedbackData.map((fb) => ({
        ...fb,
        profiles: profilesData?.find((p) => p.id === fb.user_id) || null,
      }))
    }
  }

  // Calculate stats
  const stats = {
    total: feedbackWithProfiles.length,
    open: feedbackWithProfiles.filter((f) => f.status === "open").length,
    inProgress: feedbackWithProfiles.filter((f) => f.status === "in_progress").length,
    resolved: feedbackWithProfiles.filter((f) => f.status === "resolved").length,
    closed: feedbackWithProfiles.filter((f) => f.status === "closed").length,
  }

  return (
    <div className="from-background via-background to-muted/20 min-h-screen w-full overflow-x-hidden bg-gradient-to-br">
      <div className="mx-auto max-w-7xl space-y-8 p-4 md:p-8">
        {/* Header */}
        <div>
          <div className="mb-2 flex items-center gap-3">
            <MessageSquare className="text-primary h-8 w-8" />
            <h1 className="text-foreground text-3xl font-bold md:text-4xl">User Feedback</h1>
          </div>
          <p className="text-muted-foreground text-lg">View and manage user concerns, complaints, and suggestions</p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card className="border-2 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-muted-foreground text-sm font-medium">Total Feedback</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-blue-600" />
                <span className="text-foreground text-3xl font-bold">{stats.total}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-muted-foreground text-sm font-medium">Open</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-green-600" />
                <span className="text-foreground text-3xl font-bold">{stats.open}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-muted-foreground text-sm font-medium">In Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-600" />
                <span className="text-foreground text-3xl font-bold">{stats.inProgress}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-muted-foreground text-sm font-medium">Resolved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-purple-600" />
                <span className="text-foreground text-3xl font-bold">{stats.resolved}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-muted-foreground text-sm font-medium">Closed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-gray-600" />
                <span className="text-foreground text-3xl font-bold">{stats.closed}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Feedback List */}
        <FeedbackViewerClient feedback={feedbackWithProfiles || []} />
      </div>
    </div>
  )
}
