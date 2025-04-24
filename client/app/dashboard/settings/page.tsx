import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import DashboardHeader from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { UserPlus, Settings } from "lucide-react";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect("/");
  }
  
  // Check if user is an instructor using the type-safe approach
  const isInstructor = session?.user && 'role' in session.user && session.user.role === 'instructor';
  
  return (
    <div className="flex flex-col h-full">
      <DashboardHeader 
        heading="Settings" 
        text="Configure your account and application settings"
      />
      <Separator />
      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" /> 
                Instructor Settings
              </CardTitle>
              <CardDescription>
                Become an instructor to create and manage courses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {isInstructor 
                  ? "You already have instructor privileges." 
                  : "Get instructor privileges to create courses, upload course materials, and manage students."}
              </p>
            </CardContent>
            <CardFooter>
              <Button asChild variant={isInstructor ? "outline" : "default"} disabled={isInstructor}>
                <Link href="/dashboard/settings/make-instructor">
                  {isInstructor ? "Already an Instructor" : "Become an Instructor"}
                </Link>
              </Button>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" /> 
                Account Settings
              </CardTitle>
              <CardDescription>
                Manage your account preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Update your profile, change password, and manage your account settings.
              </p>
            </CardContent>
            <CardFooter>
              <Button variant="outline" disabled>Coming Soon</Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
} 