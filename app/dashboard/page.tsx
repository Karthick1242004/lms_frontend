import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import DashboardHeader from "@/components/dashboard/dashboard-header"
import CourseList from "@/components/courses/course-list"

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  return (
    <div className="flex flex-col h-screen">
      <DashboardHeader user={session?.user} />
      <div className="flex-1 p-6 overflow-auto">
        <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
        <CourseList />
      </div>
    </div>
  )
}

