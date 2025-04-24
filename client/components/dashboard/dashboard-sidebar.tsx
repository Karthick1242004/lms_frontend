"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BookOpen, GraduationCap, LayoutDashboard, ListChecks, Settings, Users, PlusCircle, Library, UserPlus } from "lucide-react"
import { useSession } from "next-auth/react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"

export default function DashboardSidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  // Use a type safe approach to check for instructor role
  const isInstructor = session?.user && 'role' in session.user && session.user.role === 'instructor'

  const isActive = (path: string) => {
    return pathname === path || pathname.startsWith(`${path}/`)
  }

  return (
    <Sidebar>
      <SidebarHeader className="flex h-14 mt-6 items-center border-b px-4">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <GraduationCap className="h-6 w-6" />
          <span className="text-xl">LMS</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive("/dashboard")}>
              <Link href="/dashboard">
                <LayoutDashboard className="h-4 w-4" />
                <span>Dashboard</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive("/dashboard/courses")}>
              <Link href="/dashboard/courses">
                <BookOpen className="h-4 w-4" />
                <span>Courses</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          
          {/* Only show course creation for instructors */}
          {isInstructor && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isActive("/dashboard/courses/create")}>
                <Link href="/dashboard/courses/create">
                  <PlusCircle className="h-4 w-4" />
                  <span>Create Course</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive("/dashboard/attendance")}>
              <Link href="/dashboard/attendance">
                <ListChecks className="h-4 w-4" />
                <span>Attendance</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive("/dashboard/instructors")}>
              <Link href="/dashboard/instructors">
                <Users className="h-4 w-4" />
                <span>Instructors</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarSeparator />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive("/dashboard/settings")}>
              <Link href="/dashboard/settings">
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
            <SidebarMenuSub>
              <SidebarMenuSubItem>
                <SidebarMenuSubButton asChild isActive={isActive("/dashboard/settings/make-instructor")}>
                  <Link href="/dashboard/settings/make-instructor">
                    <UserPlus className="h-4 w-4" />
                    <span>Become Instructor</span>
                  </Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            </SidebarMenuSub>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="border-t p-4">
        <div className="text-xs text-muted-foreground">
          <p>© 2025 LMS Platform</p>
          <p>Version 1.0.0</p>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}

