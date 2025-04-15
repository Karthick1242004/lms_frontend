"use client"

import { useEffect } from "react"
import { useStore } from "@/lib/store"

export default function StoreProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const { syncEnrollments } = useStore()

  // Sync enrollment status on initial load
  useEffect(() => {
    syncEnrollments()
  }, [syncEnrollments])

  return <>{children}</>
} 