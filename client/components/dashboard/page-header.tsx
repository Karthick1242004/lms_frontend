"use client"

import React from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { PlusCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

interface PageHeaderProps {
  heading: string
  text?: string
  children?: React.ReactNode
}

export default function DashboardHeader({ heading, text, children }: PageHeaderProps) {
  const { data: session } = useSession()
  // Use a type safe approach to check for instructor role
  const isInstructor = session?.user && 'role' in session.user && session.user.role === 'instructor'

  return (
    <div className="flex flex-col gap-2 p-4 md:p-6 md:gap-3 justify-between md:flex-row md:items-center">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{heading}</h1>
        {text && <p className="text-muted-foreground text-sm">{text}</p>}
      </div>
      <div className="flex items-center gap-2">
        {/* Add Course button only visible to instructors */}
        {isInstructor && (
          <Button asChild variant="outline">
            <Link href="/dashboard/courses/create">
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Course
            </Link>
          </Button>
        )}
        {children}
      </div>
    </div>
  )
} 