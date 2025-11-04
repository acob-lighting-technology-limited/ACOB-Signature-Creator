"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import {
  Laptop,
  Plus,
  Search,
  Edit,
  Trash2,
  UserPlus,
  Package,
  Filter,
  LayoutGrid,
  List,
  User,
} from "lucide-react"

interface Device {
  id: string
  device_name: string
  device_type: string
  device_model?: string
  serial_number?: string
  status: string
  notes?: string
  created_at: string
  created_by: string
  current_assignment?: {
    assigned_to: string
    user: {
      first_name: string
      last_name: string
    }
  }
}

interface Staff {
  id: string
  first_name: string
  last_name: string
  company_email: string
  department: string
}

interface DeviceAssignment {
  id: string
  assigned_to: string
  assigned_at: string
  is_current: boolean
  user: {
    first_name: string
    last_name: string
  }
}

export default function AdminDevicesPage() {
  const [devices, setDevices] = useState<Device[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [viewMode, setViewMode] = useState<"list" | "card">("list")

  // Dialog states
  const [isDeviceDialogOpen, setIsDeviceDialogOpen] = useState(false)
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null)
  const [deviceToDelete, setDeviceToDelete] = useState<Device | null>(null)

  // Form states
  const [deviceForm, setDeviceForm] = useState({
    device_name: "",
    device_type: "",
    device_model: "",
    serial_number: "",
    status: "available",
    notes: "",
  })

  const [assignForm, setAssignForm] = useState({
    assigned_to: "",
    assignment_notes: "",
  })

  const [currentAssignment, setCurrentAssignment] = useState<DeviceAssignment | null>(null)

  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // Fetch devices first
      const { data: devicesData, error: devicesError } = await supabase
        .from("devices")
        .select("*")
        .order("created_at", { ascending: false })

      if (devicesError) throw devicesError

      // Fetch current assignments for all devices
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from("device_assignments")
        .select(`
          device_id,
          assigned_to,
          user:profiles!device_assignments_assigned_to_fkey (
            first_name,
            last_name
          )
        `)
        .eq("is_current", true)

      if (assignmentsError) throw assignmentsError

      // Fetch staff
      const { data: staffData, error: staffError } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, company_email, department")
        .order("last_name", { ascending: true })

      if (staffError) throw staffError

      // Combine devices with their current assignments
      const devicesWithAssignments = (devicesData || []).map((device) => {
        const assignment = (assignmentsData || []).find((a: any) => a.device_id === device.id)
        return {
          ...device,
          current_assignment: assignment ? {
            assigned_to: assignment.assigned_to,
            user: assignment.user
          } : undefined
        }
      })

      setDevices(devicesWithAssignments)
      setStaff(staffData || [])
    } catch (error) {
      console.error("Error loading data:", error)
      toast.error("Failed to load data")
    } finally {
      setIsLoading(false)
    }
  }

  const loadCurrentAssignment = async (deviceId: string) => {
    try {
      const { data, error } = await supabase
        .from("device_assignments")
        .select(`
          id,
          assigned_to,
          assigned_at,
          is_current,
          user:profiles!device_assignments_assigned_to_fkey (
            first_name,
            last_name
          )
        `)
        .eq("device_id", deviceId)
        .eq("is_current", true)
        .single()

      if (error && error.code !== "PGRST116") throw error
      setCurrentAssignment(data as any)
    } catch (error) {
      console.error("Error loading assignment:", error)
    }
  }

  const handleOpenDeviceDialog = (device?: Device) => {
    if (device) {
      setSelectedDevice(device)
      setDeviceForm({
        device_name: device.device_name,
        device_type: device.device_type,
        device_model: device.device_model || "",
        serial_number: device.serial_number || "",
        status: device.status,
        notes: device.notes || "",
      })
    } else {
      setSelectedDevice(null)
      setDeviceForm({
        device_name: "",
        device_type: "",
        device_model: "",
        serial_number: "",
        status: "available",
        notes: "",
      })
    }
    setIsDeviceDialogOpen(true)
  }

  const handleOpenAssignDialog = async (device: Device) => {
    setSelectedDevice(device)
    await loadCurrentAssignment(device.id)
    setAssignForm({
      assigned_to: "",
      assignment_notes: "",
    })
    setIsAssignDialogOpen(true)
  }

  const handleSaveDevice = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      if (selectedDevice) {
        // Update existing device
        const { error } = await supabase
          .from("devices")
          .update(deviceForm)
          .eq("id", selectedDevice.id)

        if (error) throw error

        // Log audit
        await supabase.rpc("log_audit", {
          p_action: "update",
          p_entity_type: "device",
          p_entity_id: selectedDevice.id,
          p_new_values: deviceForm,
        })

        toast.success("Device updated successfully")
      } else {
        // Create new device
        const { error } = await supabase.from("devices").insert({
          ...deviceForm,
          created_by: user.id,
        })

        if (error) throw error

        // Log audit
        await supabase.rpc("log_audit", {
          p_action: "create",
          p_entity_type: "device",
          p_entity_id: null,
          p_new_values: deviceForm,
        })

        toast.success("Device created successfully")
      }

      setIsDeviceDialogOpen(false)
      loadData()
    } catch (error) {
      console.error("Error saving device:", error)
      toast.error("Failed to save device")
    }
  }

  const handleAssignDevice = async () => {
    try {
      if (!selectedDevice || !assignForm.assigned_to) return

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Check for existing assignment
      const { data: existing } = await supabase
        .from("device_assignments")
        .select("*")
        .eq("device_id", selectedDevice.id)
        .eq("is_current", true)
        .single()

      if (existing) {
        // Mark old assignment as not current and set handover date
        await supabase
          .from("device_assignments")
          .update({
            is_current: false,
            handed_over_at: new Date().toISOString(),
            handover_notes: `Reassigned to another user`,
          })
          .eq("id", existing.id)
      }

      // Create new assignment
      const { error } = await supabase.from("device_assignments").insert({
        device_id: selectedDevice.id,
        assigned_to: assignForm.assigned_to,
        assigned_from: existing?.assigned_to || null,
        assigned_by: user.id,
        assignment_notes: assignForm.assignment_notes,
        is_current: true,
      })

      if (error) throw error

      // Update device status to assigned
      await supabase
        .from("devices")
        .update({ status: "assigned" })
        .eq("id", selectedDevice.id)

      // Log audit
      await supabase.rpc("log_audit", {
        p_action: "assign",
        p_entity_type: "device",
        p_entity_id: selectedDevice.id,
        p_new_values: {
          assigned_to: assignForm.assigned_to,
          notes: assignForm.assignment_notes,
        },
      })

      toast.success("Device assigned successfully")
      setIsAssignDialogOpen(false)
      loadData()
    } catch (error) {
      console.error("Error assigning device:", error)
      toast.error("Failed to assign device")
    }
  }

  const handleDeleteDevice = async () => {
    try {
      if (!deviceToDelete) return

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Check if device has active assignments
      const { data: assignments } = await supabase
        .from("device_assignments")
        .select("*")
        .eq("device_id", deviceToDelete.id)
        .eq("is_current", true)

      if (assignments && assignments.length > 0) {
        toast.error("Cannot delete device with active assignments")
        return
      }

      const { error } = await supabase
        .from("devices")
        .delete()
        .eq("id", deviceToDelete.id)

      if (error) throw error

      // Log audit
      await supabase.rpc("log_audit", {
        p_action: "delete",
        p_entity_type: "device",
        p_entity_id: deviceToDelete.id,
        p_old_values: deviceToDelete,
      })

      toast.success("Device deleted successfully")
      setIsDeleteDialogOpen(false)
      setDeviceToDelete(null)
      loadData()
    } catch (error) {
      console.error("Error deleting device:", error)
      toast.error("Failed to delete device")
    }
  }

  const filteredDevices = devices.filter((device) => {
    const matchesSearch =
      device.device_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      device.device_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      device.serial_number?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter === "all" || device.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const stats = {
    total: devices.length,
    available: devices.filter((d) => d.status === "available").length,
    assigned: devices.filter((d) => d.status === "assigned").length,
    maintenance: devices.filter((d) => d.status === "maintenance").length,
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "assigned":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
      case "available":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
      case "maintenance":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
      case "retired":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-4 md:p-8">
        <div className="mx-auto max-w-7xl">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="h-24 bg-muted rounded"></div>
              <div className="h-24 bg-muted rounded"></div>
              <div className="h-24 bg-muted rounded"></div>
              <div className="h-24 bg-muted rounded"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Laptop className="h-8 w-8 text-primary" />
              Device Management
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage device inventory and assignments
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center border rounded-lg p-1">
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className="gap-2"
              >
                <List className="h-4 w-4" />
                List
              </Button>
              <Button
                variant={viewMode === "card" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("card")}
                className="gap-2"
              >
                <LayoutGrid className="h-4 w-4" />
                Card
              </Button>
            </div>
            <Button onClick={() => handleOpenDeviceDialog()} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Device
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-2">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Total Devices</p>
                  <p className="text-3xl font-bold text-foreground mt-2">{stats.total}</p>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Package className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Available</p>
                  <p className="text-3xl font-bold text-foreground mt-2">{stats.available}</p>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <Package className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Assigned</p>
                  <p className="text-3xl font-bold text-foreground mt-2">{stats.assigned}</p>
                </div>
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Laptop className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Maintenance</p>
                  <p className="text-3xl font-bold text-foreground mt-2">{stats.maintenance}</p>
                </div>
                <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                  <Package className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border-2">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search devices..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="retired">Retired</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Devices List */}
        {filteredDevices.length > 0 ? (
          viewMode === "list" ? (
            <Card className="border-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Device Name</TableHead>
                    <TableHead>Type / Model</TableHead>
                    <TableHead>Serial Number</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDevices.map((device, index) => (
                    <TableRow key={device.id}>
                      <TableCell className="text-muted-foreground font-medium">{index + 1}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <Package className="h-4 w-4 text-primary" />
                          </div>
                          <span className="font-medium text-foreground">{device.device_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="text-foreground">{device.device_type}</div>
                          {device.device_model && (
                            <div className="text-xs text-muted-foreground">{device.device_model}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {device.serial_number ? (
                          <span className="text-sm font-mono text-foreground">{device.serial_number}</span>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(device.status)}>{device.status}</Badge>
                      </TableCell>
                      <TableCell>
                        {device.current_assignment ? (
                          <div className="flex items-center gap-2 text-sm">
                            <User className="h-3 w-3 text-muted-foreground" />
                            <span className="text-foreground">
                              {device.current_assignment.user.first_name} {device.current_assignment.user.last_name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenAssignDialog(device)}
                          >
                            <UserPlus className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenDeviceDialog(device)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setDeviceToDelete(device)
                              setIsDeleteDialogOpen(true)
                            }}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredDevices.map((device) => (
                <Card key={device.id} className="border-2 hover:shadow-lg transition-shadow">
                  <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-background">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Package className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{device.device_name}</CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">
                            {device.device_type}
                            {device.device_model && ` • ${device.device_model}`}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Status:</span>
                      <Badge className={getStatusColor(device.status)}>{device.status}</Badge>
                    </div>

                    {device.serial_number && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Serial:</span>
                        <span className="text-sm font-mono text-foreground">
                          {device.serial_number}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Assigned To:</span>
                      {device.current_assignment ? (
                        <div className="flex items-center gap-2">
                          <User className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm text-foreground font-medium">
                            {device.current_assignment.user.first_name} {device.current_assignment.user.last_name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Unassigned</span>
                      )}
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenAssignDialog(device)}
                        className="flex-1 gap-2"
                      >
                        <UserPlus className="h-3 w-3" />
                        Assign
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenDeviceDialog(device)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setDeviceToDelete(device)
                          setIsDeleteDialogOpen(true)
                        }}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        ) : (
          <Card className="border-2">
            <CardContent className="p-12 text-center">
              <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No Devices Found</h3>
              <p className="text-muted-foreground">
                {searchQuery || statusFilter !== "all"
                  ? "No devices match your filters"
                  : "Get started by adding your first device"}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Device Dialog */}
      <Dialog open={isDeviceDialogOpen} onOpenChange={setIsDeviceDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedDevice ? "Edit Device" : "Add New Device"}
            </DialogTitle>
            <DialogDescription>
              {selectedDevice
                ? "Update the device information below"
                : "Enter the details for the new device"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="device_name">Device Name *</Label>
                <Input
                  id="device_name"
                  value={deviceForm.device_name}
                  onChange={(e) =>
                    setDeviceForm({ ...deviceForm, device_name: e.target.value })
                  }
                  placeholder="e.g., MacBook Pro"
                />
              </div>
              <div>
                <Label htmlFor="device_type">Device Type *</Label>
                <Input
                  id="device_type"
                  value={deviceForm.device_type}
                  onChange={(e) =>
                    setDeviceForm({ ...deviceForm, device_type: e.target.value })
                  }
                  placeholder="e.g., Laptop"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="device_model">Model</Label>
                <Input
                  id="device_model"
                  value={deviceForm.device_model}
                  onChange={(e) =>
                    setDeviceForm({ ...deviceForm, device_model: e.target.value })
                  }
                  placeholder="e.g., 2023 M2"
                />
              </div>
              <div>
                <Label htmlFor="serial_number">Serial Number</Label>
                <Input
                  id="serial_number"
                  value={deviceForm.serial_number}
                  onChange={(e) =>
                    setDeviceForm({ ...deviceForm, serial_number: e.target.value })
                  }
                  placeholder="e.g., ABC123XYZ"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={deviceForm.status}
                onValueChange={(value) => setDeviceForm({ ...deviceForm, status: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="retired">Retired</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={deviceForm.notes}
                onChange={(e) => setDeviceForm({ ...deviceForm, notes: e.target.value })}
                placeholder="Additional information about the device..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeviceDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveDevice}
              disabled={!deviceForm.device_name || !deviceForm.device_type}
            >
              {selectedDevice ? "Update Device" : "Create Device"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Device</DialogTitle>
            <DialogDescription>
              Assign {selectedDevice?.device_name} to a staff member
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {currentAssignment && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-sm font-medium text-yellow-900 dark:text-yellow-200">
                  Currently assigned to: {(currentAssignment.user as any)?.first_name}{" "}
                  {(currentAssignment.user as any)?.last_name}
                </p>
                <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                  This assignment will be marked as handed over
                </p>
              </div>
            )}

            <div>
              <Label htmlFor="assigned_to">Assign To *</Label>
              <Select
                value={assignForm.assigned_to}
                onValueChange={(value) =>
                  setAssignForm({ ...assignForm, assigned_to: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select staff member" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px] overflow-y-auto">
                  {staff.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.first_name} {member.last_name} - {member.department}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {staff.length} staff members available
              </p>
            </div>

            <div>
              <Label htmlFor="assignment_notes">Assignment Notes</Label>
              <Textarea
                id="assignment_notes"
                value={assignForm.assignment_notes}
                onChange={(e) =>
                  setAssignForm({ ...assignForm, assignment_notes: e.target.value })
                }
                placeholder="Any notes about this assignment (e.g., faults, accessories included)..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssignDevice} disabled={!assignForm.assigned_to}>
              Assign Device
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deviceToDelete?.device_name}". This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeviceToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDevice}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
