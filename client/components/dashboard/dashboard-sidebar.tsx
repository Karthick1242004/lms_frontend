"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  BookOpen, GraduationCap, LayoutDashboard, ListChecks, 
  Settings, Users, PlusCircle, Library, UserPlus, BarChart, 
  Database, BrainCircuit, BookOpenCheck, FolderKanban, 
  ChevronsLeft, ChevronRight, Compass 
} from "lucide-react"
import { useSession } from "next-auth/react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { isSuperAdmin, isInstructor } from "@/lib/auth-utils"

export default function DashboardSidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const { state } = useSidebar()
  
  // Use utility functions for role checking
  const userIsInstructor = isInstructor(session)
  const userIsSuperAdmin = isSuperAdmin(session)

  const isActive = (path: string) => {
    return pathname === path || pathname.startsWith(`${path}/`)
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="flex h-16 items-center border-b px-4">
        <div className="flex pt-3 items-center justify-between w-full">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
            <GraduationCap className="h-6 w-6 text-primary" />
            <span className={cn("text-xl transition-opacity", 
              state === "collapsed" ? "opacity-0" : "opacity-100"
            )}>
              Quantum Path
            </span>
          </Link>
          {/* <SidebarTrigger className="h-8 w-8 shrink-0 rounded-md border bg-sidebar p-0">
            {state === "expanded" ? (
              <ChevronsLeft className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </SidebarTrigger> */}
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        {/* Main Navigation Group */}
        <SidebarGroup>
          <SidebarGroupLabel>Main Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
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
                    <span>My Courses</span>
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
                <SidebarMenuBadge>New</SidebarMenuBadge>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        
        {/* Instructor Group - Only show for instructors and super admin */}
        {(userIsInstructor || userIsSuperAdmin) && (
          <SidebarGroup>
            <SidebarGroupLabel>Instructor</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/dashboard/courses/create")}>
                    <Link href="/dashboard/courses/create">
                      <PlusCircle className="h-4 w-4" />
                      <span>Create Course</span>
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
            </SidebarGroupContent>
          </SidebarGroup>
        )}
        
        {/* Admin Panel - Only show for super admin */}
        {userIsSuperAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>
              <div className="flex items-center gap-2">
                <span>Admin</span>
                <Badge variant="outline" className="text-[10px] h-4 rounded-sm">Admin Only</Badge>
              </div>
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
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
                          <BookOpenCheck className="h-4 w-4" />
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
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
        
        <SidebarSeparator />
        
        {/* Settings Group */}
        <SidebarGroup>
          <SidebarGroupLabel>Settings & Account</SidebarGroupLabel>
          <SidebarGroupContent>
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
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter className="border-t p-4">
        {session?.user && (
          <div className="flex items-center gap-3 mb-4">
            <Avatar className="h-8 w-8">
              <AvatarImage src={session.user.image || ""} alt={session.user.name || "User"} />
              <AvatarFallback>{session.user.name?.charAt(0) || "U"}</AvatarFallback>
            </Avatar>
            <div className={cn("transition-opacity", state === "collapsed" ? "opacity-0" : "opacity-100")}>
              <p className="text-sm font-medium">{session.user.name}</p>
              <p className="text-xs text-muted-foreground truncate">{session.user.email}</p>
            </div>
          </div>
        )}
        {state === "expanded" ? 
        <div className="text-xs text-muted-foreground">
          <p>© 2025 Quantum Path</p>
          <p>Version 1.0.0</p>
        </div>: <div className="text-xs flex justify-center text-muted-foreground"><p>© V.1.0</p></div>
}
      </SidebarFooter>
    </Sidebar>
  )
}

