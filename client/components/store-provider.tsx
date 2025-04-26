"use client"

import { useEffect, useState } from "react"
import { useStore } from "@/lib/store"
import { useSession } from "next-auth/react"

export default function StoreProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const { syncEnrollments } = useStore()
  const { status } = useSession()
  const [syncAttempted, setSyncAttempted] = useState(false)

  // Sync enrollment status on initial load, but only if authenticated
  useEffect(() => {
    if (status === "authenticated" && !syncAttempted) {
      setSyncAttempted(true)
      const syncData = async () => {
        try {
          await syncEnrollments()
        } catch (error) {
          console.error("Failed to sync enrollments in provider:", error)
        }
      }
      syncData()
    }
  }, [syncEnrollments, status, syncAttempted])

  return <>{children}</>
} 