import { redirect } from "next/navigation"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import DashboardHeader from "@/components/dashboard/page-header"
import { Separator } from "@/components/ui/separator"
import CourseForm from "@/components/courses/course-form"

export default async function CreateCoursePage() {
  // Check if user is authenticated and is an instructor
  const session = await getServerSession(authOptions)
  
  if (!session || session.user.role !== "instructor") {
    redirect("/dashboard")
  }
  
  return (
    <div className="flex flex-col h-full">
      <DashboardHeader heading="Create Course" text="Add a new course to your offerings.">
      </DashboardHeader>
      <Separator />
      <div className="flex-1 overflow-auto p-6">
        <CourseForm />
      </div>
    </div>
  )
} 