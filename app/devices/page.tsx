"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Laptop, Calendar, User, FileText, History, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface Device {
  id: string
  device_name: string
  device_type: string
  device_model?: string
  serial_number?: string
  status: string
}

interface DeviceAssignment {
  id: string
  assigned_at: string
  assignment_notes?: string
  assigned_by: string
  device: Device
  assigner?: {
    first_name: string
    last_name: string
  }
}

interface AssignmentHistory {
  id: string
  assigned_at: string
  handed_over_at?: string
  assignment_notes?: string
  handover_notes?: string
  assigned_from_user?: {
    first_name: string
    last_name: string
  }
  assigned_by_user?: {
    first_name: string
    last_name: string
  }
}

export default function DevicesPage() {
  const [assignments, setAssignments] = useState<DeviceAssignment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null)
  const [deviceHistory, setDeviceHistory] = useState<AssignmentHistory[]>([])
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadDevices()
  }, [])

  const loadDevices = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from("device_assignments")
        .select(`
          id,
          assigned_at,
          assignment_notes,
          assigned_by,
          device:devices!device_assignments_device_id_fkey (
            id,
            device_name,
            device_type,
            device_model,
            serial_number,
            status
          ),
          assigner:profiles!device_assignments_assigned_by_fkey (
            first_name,
            last_name
          )
        `)
        .eq("assigned_to", user.id)
        .eq("is_current", true)
        .order("assigned_at", { ascending: false })

      if (error) throw error
      setAssignments(data as any || [])
    } catch (error) {
      console.error("Error loading devices:", error)
      toast.error("Failed to load devices")
    } finally {
      setIsLoading(false)
    }
  }

  const loadDeviceHistory = async (deviceId: string) => {
    try {
      const { data, error } = await supabase
        .from("device_assignments")
        .select(`
          id,
          assigned_at,
          handed_over_at,
          assignment_notes,
          handover_notes,
          assigned_from_user:profiles!device_assignments_assigned_from_fkey (
            first_name,
            last_name
          ),
          assigned_by_user:profiles!device_assignments_assigned_by_fkey (
            first_name,
            last_name
          )
        `)
        .eq("device_id", deviceId)
        .order("assigned_at", { ascending: false })

      if (error) throw error
      setDeviceHistory(data as any || [])
      setSelectedDevice(deviceId)
      setIsHistoryOpen(true)
    } catch (error) {
      console.error("Error loading device history:", error)
      toast.error("Failed to load device history")
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "assigned":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
      case "maintenance":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
      case "available":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-4 md:p-8">
        <div className="mx-auto max-w-6xl">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="h-48 bg-muted rounded"></div>
              <div className="h-48 bg-muted rounded"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Laptop className="h-8 w-8 text-primary" />
            My Devices
          </h1>
          <p className="text-muted-foreground mt-2">
            View your currently assigned devices and equipment
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-2">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Active Devices</p>
                  <p className="text-3xl font-bold text-foreground mt-2">{assignments.length}</p>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Laptop className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Devices List */}
        {assignments.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2">
            {assignments.map((assignment) => (
              <Card key={assignment.id} className="border-2 shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-background">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="p-3 bg-primary/10 rounded-lg">
                        <Package className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">{assignment.device.device_name}</CardTitle>
                        <CardDescription className="mt-1">
                          {assignment.device.device_type}
                          {assignment.device.device_model && ` • ${assignment.device.device_model}`}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge className={getStatusColor(assignment.device.status)}>
                      {assignment.device.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  {assignment.device.serial_number && (
                    <div className="flex items-center gap-2 text-sm">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Serial:</span>
                      <span className="font-mono text-foreground">{assignment.device.serial_number}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Assigned:</span>
                    <span className="text-foreground">{formatDate(assignment.assigned_at)}</span>
                  </div>

                  {assignment.assigner && (
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Assigned by:</span>
                      <span className="text-foreground">
                        {assignment.assigner.first_name} {assignment.assigner.last_name}
                      </span>
                    </div>
                  )}

                  {assignment.assignment_notes && (
                    <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm font-medium text-foreground mb-1">Notes:</p>
                      <p className="text-sm text-muted-foreground">{assignment.assignment_notes}</p>
                    </div>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadDeviceHistory(assignment.device.id)}
                    className="w-full gap-2 mt-4"
                  >
                    <History className="h-4 w-4" />
                    View History
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-2">
            <CardContent className="p-12 text-center">
              <Laptop className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No Devices Assigned</h3>
              <p className="text-muted-foreground">
                You don't have any devices assigned to you at the moment.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Device History Dialog */}
      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Device Assignment History
            </DialogTitle>
            <DialogDescription>
              Complete history of this device's assignments and transfers
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {deviceHistory.map((history, index) => (
              <div
                key={history.id}
                className={`p-4 rounded-lg border ${index === 0 ? "bg-primary/5 border-primary/20" : "bg-muted/30"}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Badge variant={index === 0 ? "default" : "outline"}>
                    {index === 0 ? "Current" : `Assignment ${deviceHistory.length - index}`}
                  </Badge>
                  <span className="text-sm text-muted-foreground">{formatDate(history.assigned_at)}</span>
                </div>

                {history.assigned_by_user && (
                  <p className="text-sm text-muted-foreground">
                    Assigned by: <span className="text-foreground font-medium">
                      {history.assigned_by_user.first_name} {history.assigned_by_user.last_name}
                    </span>
                  </p>
                )}

                {history.assigned_from_user && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Transferred from: <span className="text-foreground font-medium">
                      {history.assigned_from_user.first_name} {history.assigned_from_user.last_name}
                    </span>
                  </p>
                )}

                {history.assignment_notes && (
                  <div className="mt-2 p-2 bg-background rounded text-sm">
                    <p className="font-medium text-foreground mb-1">Assignment Notes:</p>
                    <p className="text-muted-foreground">{history.assignment_notes}</p>
                  </div>
                )}

                {history.handed_over_at && (
                  <div className="mt-2 pt-2 border-t">
                    <p className="text-sm text-muted-foreground">
                      Handed over: <span className="text-foreground">{formatDate(history.handed_over_at)}</span>
                    </p>
                    {history.handover_notes && (
                      <div className="mt-2 p-2 bg-background rounded text-sm">
                        <p className="font-medium text-foreground mb-1">Handover Notes:</p>
                        <p className="text-muted-foreground">{history.handover_notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
