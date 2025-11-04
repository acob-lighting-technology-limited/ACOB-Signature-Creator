import Image from "next/image"

export function AuthHeader() {
  return (
    <nav className="border-b border-border bg-background sticky top-0 z-40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-4">
            <Image src="/acob-logo.webp" alt="ACOB Lighting" width={200} height={200} />
          </div>
        </div>
      </div>
    </nav>
  )
}
