import { notFound } from "next/navigation"
import { getCourseById } from "@/lib/api"
import DashboardHeader from "@/components/dashboard/dashboard-header"
import CourseDetails from "@/components/courses/course-details"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

export default async function CoursePage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const course = await getCourseById(params.id)

  if (!course) {
    notFound()
  }

  return (
    <div className="flex flex-col h-screen">
      <DashboardHeader user={session?.user} />
      <div className="flex-1 p-6 overflow-auto">
        <CourseDetails course={course} />
      </div>
    </div>
  )
}

