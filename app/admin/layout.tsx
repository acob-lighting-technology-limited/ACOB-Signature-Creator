import type { Metadata } from "next"
import { AdminLayout } from "@/components/admin-layout"

export const metadata: Metadata = {
  title: "Admin Dashboard | ACOB Lighting Technology Limited",
  description: "Manage users, view feedback, and oversee all administrative functions for ACOB Lighting Technology Limited",
}

export default function AdminLayoutPage({
  children,
}: {
  children: React.ReactNode
}) {
  return <AdminLayout>{children}</AdminLayout>
}
