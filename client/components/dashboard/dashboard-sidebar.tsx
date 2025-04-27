"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BookOpen, GraduationCap, LayoutDashboard, ListChecks, Settings, Users, PlusCircle, Library, UserPlus, BarChart, Database, BrainCircuit } from "lucide-react"
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
import { isSuperAdmin, isInstructor } from "@/lib/auth-utils"

export default function DashboardSidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  
  // Use utility functions for role checking
  const userIsInstructor = isInstructor(session)
  const userIsSuperAdmin = isSuperAdmin(session)

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
          {/* <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive("/dashboard/courses")}>
              <Link href="/dashboard/courses">
                <BookOpen className="h-4 w-4" />
                <span>Courses</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem> */}
          
          {/* Only show course creation for instructors and super admin */}
          {(userIsInstructor || userIsSuperAdmin) && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isActive("/dashboard/courses/create")}>
                <Link href="/dashboard/courses/create">
                  <PlusCircle className="h-4 w-4" />
                  <span>Create Course</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          
          {/* <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive("/dashboard/attendance")}>
              <Link href="/dashboard/attendance">
                <ListChecks className="h-4 w-4" />
                <span>Attendance</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem> */}
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive("/dashboard/instructors")}>
              <Link href="/dashboard/instructors">
                <Users className="h-4 w-4" />
                <span>Instructors</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive("/dashboard/ai-assistant")}>
              <Link href="/dashboard/ai-assistant">
                <BrainCircuit className="h-4 w-4" />
                <span>Ask AI</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          
          {/* Only show admin section for super admin */}
          {userIsSuperAdmin && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isActive("/dashboard/admin")}>
                <Link href="/dashboard/admin">
                  <Database className="h-4 w-4" />
                  <span>Admin Panel</span>
                </Link>
              </SidebarMenuButton>
              <SidebarMenuSub>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton asChild isActive={isActive("/dashboard/admin/users")}>
                    <Link href="/dashboard/admin/users">
                      <Users className="h-4 w-4" />
                      <span>Users</span>
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton asChild isActive={isActive("/dashboard/admin/enrollments")}>
                    <Link href="/dashboard/admin/enrollments">
                      <BookOpen className="h-4 w-4" />
                      <span>Enrollments</span>
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton asChild isActive={isActive("/dashboard/admin/progress")}>
                    <Link href="/dashboard/admin/progress">
                      <BarChart className="h-4 w-4" />
                      <span>Progress</span>
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              </SidebarMenuSub>
            </SidebarMenuItem>
          )}
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
              {/* Only show "Become Instructor" for super admin */}
              {userIsSuperAdmin && (
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton asChild isActive={isActive("/dashboard/settings/make-instructor")}>
                    <Link href="/dashboard/settings/make-instructor">
                      <UserPlus className="h-4 w-4" />
                      <span>Become Instructor</span>
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              )}
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

