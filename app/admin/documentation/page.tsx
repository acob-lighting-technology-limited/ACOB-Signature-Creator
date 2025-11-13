"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { Building2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { formatName } from "@/lib/utils"
import { FileText, Search, Filter, Eye, User, Calendar, Tag, FolderOpen, LayoutGrid, List } from "lucide-react"
import type { UserRole } from "@/types/database"

interface Documentation {
  id: string
  title: string
  content: string
  category: string | null
  tags: string[] | null
  is_draft: boolean
  created_at: string
  updated_at: string
  user_id: string
  user?: {
    first_name: string
    last_name: string
    company_email: string
    department: string
    role: UserRole
  }
}

interface UserProfile {
  role: UserRole
  lead_departments?: string[]
}

export default function AdminDocumentationPage() {
  const [documentation, setDocumentation] = useState<Documentation[]>([])
  const [staff, setStaff] = useState<{ id: string; first_name: string; last_name: string; department: string }[]>([])
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [departmentFilter, setDepartmentFilter] = useState("all")
  const [staffFilter, setStaffFilter] = useState("all")
  const [viewMode, setViewMode] = useState<"list" | "card">("list")
  const [selectedDoc, setSelectedDoc] = useState<Documentation | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      // Get user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, lead_departments")
        .eq("id", user.id)
        .single()

      setUserProfile(profile)

      // Fetch documentation - leads can only see documentation from their departments
      let docsQuery = supabase.from("user_documentation").select("*").order("created_at", { ascending: false })

      // If user is a lead, filter by their lead departments
      if (profile?.role === "lead" && profile.lead_departments && profile.lead_departments.length > 0) {
        // Get all user IDs in the lead's departments
        const { data: deptUsers } = await supabase
          .from("profiles")
          .select("id")
          .in("department", profile.lead_departments)

        const userIds = deptUsers?.map((u) => u.id) || []
        if (userIds.length > 0) {
          docsQuery = docsQuery.in("user_id", userIds)
        } else {
          // No users in departments, return empty
          setDocumentation([])
          setStaff([])
          setIsLoading(false)
          return
        }
      }

      const { data: docsData, error: docsError } = await docsQuery

      if (docsError) {
        console.error("Documentation error:", docsError)
        throw docsError
      }

      // If we have documentation, fetch user details for each unique user_id
      if (docsData && docsData.length > 0) {
        const userIdsSet = new Set(docsData.map((doc) => doc.user_id).filter(Boolean))
        const uniqueUserIds = Array.from(userIdsSet)

        const { data: usersData } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, company_email, department, role")
          .in("id", uniqueUserIds)

        // Create a map of user data
        const usersMap = new Map(usersData?.map((user) => [user.id, user]))

        // Combine docs with user data (already filtered by RLS for leads)
        const docsWithUsers = docsData.map((doc) => ({
          ...doc,
          user: doc.user_id ? usersMap.get(doc.user_id) : null,
        }))

        setDocumentation(docsWithUsers as any)
      } else {
        setDocumentation([])
      }

      // Load staff for filter
      const { data: staffData } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, department")
        .order("last_name", { ascending: true })
      setStaff(staffData || [])
    } catch (error: any) {
      console.error("Error loading documentation:", error)
      toast.error("Failed to load documentation")
    } finally {
      setIsLoading(false)
    }
  }

  const handleViewDocument = (doc: Documentation) => {
    setSelectedDoc(doc)
    setIsViewDialogOpen(true)
  }

  const filteredDocumentation = documentation.filter((doc) => {
    const matchesSearch =
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.user?.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.user?.last_name?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesCategory = categoryFilter === "all" || doc.category === categoryFilter

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "published" && !doc.is_draft) ||
      (statusFilter === "draft" && doc.is_draft)

    // Filter by department - for leads, always filter by their departments
    let matchesDepartment = true
    if (userProfile?.role === "lead") {
      // Leads: documentation is already filtered, but ensure it matches lead's departments
      if (userProfile.lead_departments && userProfile.lead_departments.length > 0) {
        matchesDepartment = doc.user?.department ? userProfile.lead_departments.includes(doc.user.department) : false
      }
    } else {
      // Admins: use department filter
      matchesDepartment = departmentFilter === "all" || doc.user?.department === departmentFilter
    }

    const matchesStaff = staffFilter === "all" || doc.user_id === staffFilter

    return matchesSearch && matchesCategory && matchesStatus && matchesDepartment && matchesStaff
  })

  const categories = Array.from(new Set(documentation.map((d) => d.category).filter(Boolean))) as string[]

  const departments = Array.from(new Set(documentation.map((d) => d.user?.department).filter(Boolean))) as string[]

  const stats = {
    total: documentation.length,
    published: documentation.filter((d) => !d.is_draft).length,
    drafts: documentation.filter((d) => d.is_draft).length,
    thisMonth: documentation.filter(
      (d) =>
        new Date(d.created_at).getMonth() === new Date().getMonth() &&
        new Date(d.created_at).getFullYear() === new Date().getFullYear()
    ).length,
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const getStatusColor = (isDraft: boolean) => {
    return isDraft
      ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
      : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
  }

  return (
    <div className="from-background via-background to-muted/20 min-h-screen w-full overflow-x-hidden bg-gradient-to-br">
      <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-foreground flex items-center gap-2 text-2xl font-bold sm:gap-3 sm:text-3xl">
              <FileText className="text-primary h-6 w-6 sm:h-8 sm:w-8" />
              Staff Documentation
            </h1>
            <p className="text-muted-foreground mt-2 text-sm sm:text-base">
              View all staff documentation and knowledge base articles
            </p>
          </div>
          <div className="flex items-center rounded-lg border p-1">
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="gap-1 sm:gap-2"
            >
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">List</span>
            </Button>
            <Button
              variant={viewMode === "card" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("card")}
              className="gap-1 sm:gap-2"
            >
              <LayoutGrid className="h-4 w-4" />
              <span className="hidden sm:inline">Card</span>
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-2">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium">Total Documents</p>
                  <p className="text-foreground mt-2 text-3xl font-bold">{stats.total}</p>
                </div>
                <div className="rounded-lg bg-blue-100 p-3 dark:bg-blue-900/30">
                  <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium">Published</p>
                  <p className="text-foreground mt-2 text-3xl font-bold">{stats.published}</p>
                </div>
                <div className="rounded-lg bg-green-100 p-3 dark:bg-green-900/30">
                  <FileText className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium">Drafts</p>
                  <p className="text-foreground mt-2 text-3xl font-bold">{stats.drafts}</p>
                </div>
                <div className="rounded-lg bg-yellow-100 p-3 dark:bg-yellow-900/30">
                  <FileText className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium">This Month</p>
                  <p className="text-foreground mt-2 text-3xl font-bold">{stats.thisMonth}</p>
                </div>
                <div className="rounded-lg bg-purple-100 p-3 dark:bg-purple-900/30">
                  <Calendar className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border-2">
          <CardContent className="p-6">
            <div className="flex flex-col gap-4 md:flex-row">
              <div className="relative flex-1">
                <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
                <Input
                  placeholder="Search documentation..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* Department filter - hidden for leads */}
              {userProfile?.role !== "lead" && (
                <SearchableSelect
                  value={departmentFilter}
                  onValueChange={setDepartmentFilter}
                  placeholder="All Departments"
                  searchPlaceholder="Search departments..."
                  icon={<Building2 className="h-4 w-4" />}
                  className="w-full md:w-48"
                  options={[
                    { value: "all", label: "All Departments" },
                    ...departments.map((dept) => ({
                      value: dept,
                      label: dept,
                      icon: <Building2 className="h-3 w-3" />,
                    })),
                  ]}
                />
              )}
              <SearchableSelect
                value={staffFilter}
                onValueChange={setStaffFilter}
                placeholder={
                  userProfile?.role === "lead" &&
                  userProfile.lead_departments &&
                  userProfile.lead_departments.length > 0
                    ? `All ${userProfile.lead_departments.length === 1 ? userProfile.lead_departments[0] : "Department"} Staff`
                    : "All Staff"
                }
                searchPlaceholder="Search staff..."
                icon={<User className="h-4 w-4" />}
                className="w-full md:w-48"
                options={[
                  {
                    value: "all",
                    label:
                      userProfile?.role === "lead" &&
                      userProfile.lead_departments &&
                      userProfile.lead_departments.length > 0
                        ? `All ${userProfile.lead_departments.length === 1 ? userProfile.lead_departments[0] : "Department"} Staff`
                        : "All Staff",
                  },
                  ...staff.map((member) => ({
                    value: member.id,
                    label: `${formatName(member.first_name)} ${formatName(member.last_name)} - ${member.department}`,
                    icon: <User className="h-3 w-3" />,
                  })),
                ]}
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Documentation List */}
        {filteredDocumentation.length > 0 ? (
          viewMode === "list" ? (
            <Card className="border-2">
              <CardContent className="p-6">
                <div className="table-responsive">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Author</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDocumentation.map((doc, index) => (
                        <TableRow key={doc.id}>
                          <TableCell className="text-muted-foreground font-medium">{index + 1}</TableCell>
                          <TableCell>
                            {doc.user?.first_name && doc.user?.last_name
                              ? `${formatName(doc.user.last_name)}, ${formatName(doc.user.first_name)}`
                              : doc.user?.first_name || doc.user?.last_name
                                ? formatName(doc.user.first_name || doc.user.last_name)
                                : "-"}
                          </TableCell>
                          <TableCell>{doc.user?.department || "No Department"}</TableCell>
                          <TableCell className="font-medium">{doc.title}</TableCell>
                          <TableCell>
                            {doc.category ? (
                              <Badge variant="outline" className="text-xs">
                                {doc.category}
                              </Badge>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(doc.is_draft)}>
                              {doc.is_draft ? "Draft" : "Published"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">{formatDate(doc.created_at)}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDocument(doc)}
                              className="h-8 w-8 gap-1 p-0 sm:h-auto sm:w-auto sm:gap-2 sm:p-2"
                              title="View document"
                            >
                              <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                              <span className="hidden sm:inline">View</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredDocumentation.map((doc) => (
                <Card key={doc.id} className="border-2 transition-shadow hover:shadow-lg">
                  <CardHeader className="from-primary/5 to-background border-b bg-gradient-to-r">
                    <div className="flex items-start justify-between">
                      <div className="flex flex-1 items-start gap-3">
                        <div className="bg-primary/10 rounded-lg p-2">
                          <FileText className="text-primary h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <CardTitle className="line-clamp-2 text-lg">{doc.title}</CardTitle>
                          <div className="mt-2 flex items-center gap-2">
                            <Badge className={getStatusColor(doc.is_draft)}>
                              {doc.is_draft ? "Draft" : "Published"}
                            </Badge>
                            {doc.category && (
                              <Badge variant="outline" className="text-xs">
                                {doc.category}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 p-4">
                    <div className="text-muted-foreground flex items-center gap-2 text-sm">
                      <User className="h-4 w-4" />
                      <span>
                        {doc.user?.first_name} {doc.user?.last_name}
                      </span>
                    </div>

                    <div className="text-muted-foreground flex items-center gap-2 text-sm">
                      <FolderOpen className="h-4 w-4" />
                      <span>{doc.user?.department || "No Department"}</span>
                    </div>

                    <div className="text-muted-foreground flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(doc.created_at)}</span>
                    </div>

                    {doc.tags && doc.tags.length > 0 && (
                      <div className="flex items-start gap-2">
                        <Tag className="text-muted-foreground mt-1 h-4 w-4" />
                        <div className="flex flex-wrap gap-1">
                          {doc.tags.slice(0, 3).map((tag, index) => (
                            <span key={index} className="bg-muted rounded px-2 py-1 text-xs">
                              {tag}
                            </span>
                          ))}
                          {doc.tags.length > 3 && (
                            <span className="text-muted-foreground px-2 py-1 text-xs">+{doc.tags.length - 3} more</span>
                          )}
                        </div>
                      </div>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDocument(doc)}
                      className="w-full gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      View Document
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        ) : (
          <Card className="border-2">
            <CardContent className="p-12 text-center">
              <FileText className="text-muted-foreground mx-auto mb-4 h-16 w-16" />
              <h3 className="text-foreground mb-2 text-xl font-semibold">No Documentation Found</h3>
              <p className="text-muted-foreground">
                {searchQuery ||
                categoryFilter !== "all" ||
                statusFilter !== "all" ||
                departmentFilter !== "all" ||
                staffFilter !== "all"
                  ? "No documentation matches your filters"
                  : "No documentation has been created yet"}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* View Document Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-h-[80vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">{selectedDoc?.title}</DialogTitle>
            <DialogDescription>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <Badge className={getStatusColor(selectedDoc?.is_draft || false)}>
                  {selectedDoc?.is_draft ? "Draft" : "Published"}
                </Badge>
                {selectedDoc?.category && <span className="text-sm">Category: {selectedDoc.category}</span>}
                <span className="text-sm">
                  By {selectedDoc?.user?.first_name} {selectedDoc?.user?.last_name}
                </span>
                <span className="text-sm">{selectedDoc?.created_at && formatDate(selectedDoc.created_at)}</span>
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            {selectedDoc?.tags && selectedDoc.tags.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-2">
                {selectedDoc.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
            <div className="prose dark:prose-invert max-w-none">
              <div className="bg-muted/50 rounded-lg p-4 whitespace-pre-wrap">{selectedDoc?.content}</div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
