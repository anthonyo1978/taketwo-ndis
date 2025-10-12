"use client"

import { Toaster } from "react-hot-toast"
import { SessionProvider } from "lib/contexts/SessionContext"
import { AdminSidebar } from "components/admin/AdminSidebar"
import { AdminGuard } from "components/auth/AdminGuard"
import { AdminLayoutContent } from "components/layout/AdminLayoutContent"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AdminGuard>
      <SessionProvider>
        <AdminLayoutContent>{children}</AdminLayoutContent>
      </SessionProvider>
    </AdminGuard>
  )
}