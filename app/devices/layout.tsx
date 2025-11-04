import type { Metadata } from "next"
import { AppLayout } from "@/components/app-layout"

export const metadata: Metadata = {
  title: "My Devices | ACOB Lighting Technology Limited",
  description: "View your assigned devices and equipment",
}

export default function DevicesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AppLayout>{children}</AppLayout>
}
