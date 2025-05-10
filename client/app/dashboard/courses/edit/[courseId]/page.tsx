import { redirect, notFound } from "next/navigation"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import DashboardHeader from "@/components/dashboard/page-header"
import { Separator } from "@/components/ui/separator"
import CourseForm from "@/components/courses/course-form"
import { connectToDatabase } from "@/lib/mongodb"

interface EditCoursePageProps {
  params: {
    courseId: string
  }
}

export default async function EditCoursePage({ params }: EditCoursePageProps) {
  // Check if user is authenticated and is an instructor
  const session = await getServerSession(authOptions)
  
  if (!session || session.user.role !== "instructor") {
    redirect("/dashboard")
  }
  
  // Fetch the course data
  const { db } = await connectToDatabase()
  const course = await db.collection("coursedetails").findOne({ id: params.courseId })
  
  if (!course) {
    notFound()
  }
  
  return (
    <div className="flex flex-col h-full">
      <DashboardHeader heading="Edit Course" text="Update your course details.">
      </DashboardHeader>
      <Separator />
      <div className="flex-1 overflow-auto p-6">
        <CourseForm initialData={course} isEditing />
      </div>
    </div>
  )
} 