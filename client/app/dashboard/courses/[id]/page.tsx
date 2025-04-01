import { notFound } from "next/navigation"
import { getCourseById } from "@/lib/api"
import DashboardHeader from "@/components/dashboard/dashboard-header"
import CourseDetails from "@/components/courses/course-details"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

interface CoursePageProps {
  params: {
    id: string
  }
}

export default async function CoursePage({ params }: CoursePageProps) {
  const session = await getServerSession(authOptions)
  const course = await getCourseById(params.id)

  if (!course) {
    notFound()
  }

  return (
    <div className="flex flex-col h-screen">
      <DashboardHeader user={session?.user} />
      <div className="flex-1 p-6 overflow-auto">
        <CourseDetails courseId={params.id} />
      </div>
    </div>
  )
}

