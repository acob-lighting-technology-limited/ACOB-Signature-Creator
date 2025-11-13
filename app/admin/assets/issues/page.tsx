"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { formatName } from "@/lib/utils"
import { ASSET_TYPE_MAP } from "@/lib/asset-types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle2, Trash2, Search, Package, Calendar, User, Filter } from "lucide-react"
import { SearchableSelect } from "@/components/ui/searchable-select"

interface AssetIssue {
  id: string
  asset_id: string
  description: string
  resolved: boolean
  created_at: string
  resolved_at?: string
  resolved_by?: string
  created_by: string
  asset?: {
    unique_code: string
    asset_type: string
    status: string
  }
  creator?: {
    first_name: string
    last_name: string
  }
  resolver?: {
    first_name: string
    last_name: string
  }
}

export default function AssetIssuesPage() {
  const [issues, setIssues] = useState<AssetIssue[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("unresolved")
  const [assetTypeFilter, setAssetTypeFilter] = useState("all")

  const supabase = createClient()

  useEffect(() => {
    loadIssues()
  }, [])

  const loadIssues = async () => {
    try {
      setLoading(true)

      // Fetch all issues with asset and user details
      const { data: issuesData, error: issuesError } = await supabase
        .from("asset_issues")
        .select("*")
        .order("created_at", { ascending: false })

      if (issuesError) throw issuesError

      // Fetch asset details for each issue
      const issuesWithDetails = await Promise.all(
        (issuesData || []).map(async (issue) => {
          // Get asset details
          const { data: assetData } = await supabase
            .from("assets")
            .select("unique_code, asset_type, status")
            .eq("id", issue.asset_id)
            .single()

          // Get creator details
          const { data: creatorData } = await supabase
            .from("profiles")
            .select("first_name, last_name")
            .eq("id", issue.created_by)
            .single()

          // Get resolver details if resolved
          let resolverData = null
          if (issue.resolved_by) {
            const { data } = await supabase
              .from("profiles")
              .select("first_name, last_name")
              .eq("id", issue.resolved_by)
              .single()
            resolverData = data
          }

          return {
            ...issue,
            asset: assetData,
            creator: creatorData,
            resolver: resolverData,
          }
        })
      )

      setIssues(issuesWithDetails as AssetIssue[])
    } catch (error: any) {
      console.error("Error loading issues:", error)
      toast.error("Failed to load issues")
    } finally {
      setLoading(false)
    }
  }

  const handleToggleResolved = async (issue: AssetIssue) => {
    try {
      const { error } = await supabase.from("asset_issues").update({ resolved: !issue.resolved }).eq("id", issue.id)

      if (error) throw error

      toast.success(issue.resolved ? "Issue marked as unresolved" : "Issue marked as resolved")
      await loadIssues()
    } catch (error: any) {
      console.error("Error toggling issue:", error)
      toast.error("Failed to update issue")
    }
  }

  const handleDeleteIssue = async (issueId: string) => {
    if (!confirm("Are you sure you want to delete this issue?")) return

    try {
      const { error } = await supabase.from("asset_issues").delete().eq("id", issueId)

      if (error) throw error

      toast.success("Issue deleted")
      await loadIssues()
    } catch (error: any) {
      console.error("Error deleting issue:", error)
      toast.error("Failed to delete issue")
    }
  }

  const filteredIssues = issues.filter((issue) => {
    const matchesSearch =
      searchQuery === "" ||
      issue.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.asset?.unique_code.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "resolved" && issue.resolved) ||
      (statusFilter === "unresolved" && !issue.resolved)

    const matchesAssetType = assetTypeFilter === "all" || issue.asset?.asset_type === assetTypeFilter

    return matchesSearch && matchesStatus && matchesAssetType
  })

  const stats = {
    total: issues.length,
    unresolved: issues.filter((i) => !i.resolved).length,
    resolved: issues.filter((i) => i.resolved).length,
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-foreground text-3xl font-bold">Asset Issues</h1>
        <p className="text-muted-foreground mt-1">Track and manage all asset issues across the organization</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Issues</CardTitle>
            <AlertCircle className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-muted-foreground text-xs">All tracked issues</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unresolved Issues</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.unresolved}</div>
            <p className="text-muted-foreground text-xs">Requiring attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved Issues</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.resolved}</div>
            <p className="text-muted-foreground text-xs">Successfully fixed</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="relative">
              <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
              <Input
                placeholder="Search issues or asset codes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <SearchableSelect
              value={statusFilter}
              onValueChange={setStatusFilter}
              placeholder="Filter by status"
              searchPlaceholder="Search status..."
              icon={<Filter className="h-4 w-4" />}
              options={[
                { value: "all", label: "All Issues" },
                {
                  value: "unresolved",
                  label: "Unresolved",
                  icon: <AlertCircle className="h-3 w-3 text-orange-500" />,
                },
                {
                  value: "resolved",
                  label: "Resolved",
                  icon: <CheckCircle2 className="h-3 w-3 text-green-500" />,
                },
              ]}
            />

            <SearchableSelect
              value={assetTypeFilter}
              onValueChange={setAssetTypeFilter}
              placeholder="All Asset Types"
              searchPlaceholder="Search asset types..."
              icon={<Package className="h-4 w-4" />}
              options={[
                { value: "all", label: "All Asset Types" },
                ...Object.entries(ASSET_TYPE_MAP).map(([key, value]) => ({
                  value: key,
                  label: value.label,
                })),
              ]}
            />
          </div>
        </CardContent>
      </Card>

      {/* Issues Table */}
      <Card>
        <CardHeader>
          <CardTitle>Issues List ({filteredIssues.length})</CardTitle>
          <CardDescription>
            {statusFilter === "unresolved"
              ? "Showing unresolved issues requiring attention"
              : statusFilter === "resolved"
                ? "Showing resolved issues"
                : "Showing all issues"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center">
              <div className="border-primary mx-auto h-8 w-8 animate-spin rounded-full border-b-2"></div>
              <p className="text-muted-foreground mt-4">Loading issues...</p>
            </div>
          ) : filteredIssues.length === 0 ? (
            <div className="py-12 text-center">
              <AlertCircle className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
              <p className="text-muted-foreground">
                {searchQuery || statusFilter !== "all" || assetTypeFilter !== "all"
                  ? "No issues match your filters"
                  : "No issues tracked yet"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">Status</TableHead>
                    <TableHead>Asset</TableHead>
                    <TableHead>Issue Description</TableHead>
                    <TableHead>Reported By</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredIssues.map((issue) => (
                    <TableRow
                      key={issue.id}
                      className={
                        issue.resolved ? "bg-green-50/50 dark:bg-green-950/10" : "bg-orange-50/50 dark:bg-orange-950/10"
                      }
                    >
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleResolved(issue)}
                          className="h-8 w-8 p-0"
                        >
                          {issue.resolved ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          ) : (
                            <div className="h-5 w-5 rounded-full border-2 border-orange-500" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="bg-primary/10 rounded p-1.5">
                            <Package className="text-primary h-3 w-3" />
                          </div>
                          <div>
                            <div className="font-mono text-xs font-medium">{issue.asset?.unique_code}</div>
                            <div className="text-muted-foreground text-xs">
                              {ASSET_TYPE_MAP[issue.asset?.asset_type || ""]?.label || issue.asset?.asset_type}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-md">
                          <p
                            className={`text-sm ${
                              issue.resolved ? "text-muted-foreground line-through" : "text-foreground"
                            }`}
                          >
                            {issue.description}
                          </p>
                          {issue.resolved && issue.resolved_at && (
                            <div className="mt-1 flex items-center gap-1 text-xs text-green-600">
                              <CheckCircle2 className="h-3 w-3" />
                              <span>
                                Resolved {new Date(issue.resolved_at).toLocaleDateString()}
                                {issue.resolver && (
                                  <span>
                                    {" "}
                                    by {formatName(issue.resolver.first_name)} {formatName(issue.resolver.last_name)}
                                  </span>
                                )}
                              </span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <User className="text-muted-foreground h-3 w-3" />
                          <span className="text-sm">
                            {issue.creator
                              ? `${formatName(issue.creator.first_name)} ${formatName(issue.creator.last_name)}`
                              : "Unknown"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-muted-foreground flex items-center gap-1.5 text-sm">
                          <Calendar className="h-3 w-3" />
                          {new Date(issue.created_at).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteIssue(issue.id)}
                          className="text-destructive hover:text-destructive h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
