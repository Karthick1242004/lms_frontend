import DashboardContainer from "@/components/dashboard/dashboard-container"
import AttendanceRecords from "@/components/dashboard/attendance-records"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Attendance | Dashboard",
  description: "View your course attendance and video completion records",
}

export default function AttendancePage() {
  return (
    <DashboardContainer>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Attendance</h1>
          <p className="text-muted-foreground">
            View your attendance and video completion records for all courses
          </p>
        </div>
        
        <AttendanceRecords />
      </div>
    </DashboardContainer>
  )
} 