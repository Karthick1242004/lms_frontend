import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import Link from "next/link"
import DashboardHeader from "@/components/dashboard/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { connectToDatabase } from "@/lib/mongodb"
import { UserCheck, BarChart2 } from "lucide-react"

export default async function InstructorsPage() {
  const session = await getServerSession(authOptions)
  // Use a type safe approach to check for admin role
  const isAdmin = session?.user && 'role' in session.user && session.user.role === 'admin'
  
  // Fetch instructors if we need to display them
  const { db } = await connectToDatabase()
  
  // This is a placeholder - replace with actual instructor data fetching
  const instructors = await db.collection("users")
    .find({ role: "instructor" })
    .toArray();

  return (
    <div className="flex flex-col h-full">
      <DashboardHeader 
        heading="Instructors" 
        text="Manage instructors and their permissions"
      >
        <Button variant="outline" asChild>
          <Link href="/dashboard/instructors/analytics">
            <BarChart2 className="h-4 w-4 mr-2" />
            Course Analytics
          </Link>
        </Button>
      </DashboardHeader>
      <Separator />
      <div className="flex-1 overflow-auto p-6">
        {/* Analytics Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Instructor Analytics</CardTitle>
            <CardDescription>
              Access detailed analytics for your courses, including attendance, assessment performance, and student progress.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <p className="text-sm">Monitor student engagement and course performance metrics</p>
              </div>
              <Button asChild>
                <Link href="/dashboard/instructors/analytics">
                  View Analytics
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {instructors.length > 0 ? (
            instructors.map((instructor) => (
              <Card key={instructor._id.toString()} className="overflow-hidden">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="line-clamp-1">{instructor.name}</CardTitle>
                      <CardDescription className="line-clamp-2">{instructor.email}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <UserCheck className="h-5 w-5 text-green-500" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div className="flex flex-col space-y-1">
                      <span className="text-sm text-muted-foreground">Role</span>
                      <span className="font-medium">Instructor</span>
                    </div>
                    {isAdmin && (
                      <Button variant="outline" size="sm">
                        Manage
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full text-center py-8">
              <p className="text-muted-foreground">No instructors found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 