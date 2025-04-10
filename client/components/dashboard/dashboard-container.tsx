"use client"

import { ReactNode } from "react"
import DashboardSidebar from "./dashboard-sidebar"

interface DashboardContainerProps {
  children: ReactNode
}

export default function DashboardContainer({ children }: DashboardContainerProps) {
  return (
    <div className="flex min-h-screen">
      <DashboardSidebar />
      <main className="flex-1 p-8">
        {children}
      </main>
    </div>
  )
} 