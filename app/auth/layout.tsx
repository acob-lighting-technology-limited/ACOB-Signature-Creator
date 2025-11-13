import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Authentication | ACOB Lighting Technology Limited",
  description: "Sign in or create an account for ACOB Lighting Technology Limited",
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <div className="bg-background flex min-h-screen items-center justify-center">{children}</div>
}
