"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { fetchCourses } from "@/lib/api"
import { useStore } from "@/lib/store"
import type { Course } from "@/lib/types"
import { AlertCircle, PlusCircle, AlertTriangle, Search, Filter, X } from "lucide-react"
import { useSession } from "next-auth/react"
import { hasInstructorPrivileges } from "@/lib/auth-utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"

// Fallback mock data to display if API fails
const MOCK_COURSES: Course[] = [
  {
    id: "1",
    title: "Introduction to Web Development",
    description: "Learn the basics of HTML, CSS, and JavaScript to build your first website.",
    instructor: "John Doe",
    image: "/placeholder.svg",
    level: "Beginner",
    duration: "4 weeks",
    students: 120,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    language: "English",
    certificate: true
  },
  {
    id: "2",
    title: "Advanced React Patterns",
    description: "Master advanced React concepts including hooks, context, and performance optimization.",
    instructor: "Jane Smith",
    image: "/placeholder.svg",
    level: "Advanced",
    duration: "6 weeks",
    students: 85,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    language: "English",
    certificate: true
  }
];

export default function CourseList() {
  const { toast } = useToast()
  const { data: session } = useSession()
  const { enrolledCourses, enrollInCourse, loadingEnrollment } = useStore()
  const [isEnrolling, setIsEnrolling] = useState<{[key: string]: boolean}>({})
  const isInstructor = hasInstructorPrivileges(session)
  const [nameDialogOpen, setNameDialogOpen] = useState(false)
  const [realName, setRealName] = useState("")
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [nameError, setNameError] = useState("")
  
  // Add state for filter dialog
  const [filterDialogOpen, setFilterDialogOpen] = useState(false)
  
  // Current applied filters
  const [appliedFilters, setAppliedFilters] = useState({
    searchQuery: "",
    durationFilter: "all",
    levelFilter: "all",
    instructorFilter: "all"
  })
  
  // Temporary filters (for the dialog)
  const [tempFilters, setTempFilters] = useState({
    searchQuery: "",
    durationFilter: "all",
    levelFilter: "all",
    instructorFilter: "all"
  })
  
  const [courseProgress, setCourseProgress] = useState<{[key: string]: number}>({})
  const [attendanceProgress, setAttendanceProgress] = useState<{[key: string]: number}>({})

  const {
    data: courses,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["courses"],
    queryFn: fetchCourses,
  })

  // Add query for fetching course progress
  const { data: progressData } = useQuery({
    queryKey: ["courseProgress"],
    queryFn: async () => {
      const response = await fetch('/api/user/progress')
      if (!response.ok) throw new Error('Failed to fetch progress')
      return response.json()
    },
    enabled: !!session?.user
  })

  useEffect(() => {
    if (error) {
      console.error("Error loading courses:", error)
      toast({
        title: "Error",
        description: "Failed to load courses. Please try again.",
        variant: "destructive",
      })
    }
  }, [error, toast, courses])

  useEffect(() => {
    if (progressData?.courses) {
      const progressMap: {[key: string]: number} = {}
      Object.entries(progressData.courses).forEach(([courseId, data]: [string, any]) => {
        progressMap[courseId] = data.overallProgress || 0
      })
      setCourseProgress(progressMap)
    }
  }, [progressData])

  // Fetch attendance progress for each enrolled course
  useEffect(() => {
    const fetchProgress = async () => {
      const progressMap: {[key: string]: number} = {}
      await Promise.all(
        enrolledCourses.map(async (courseId) => {
          try {
            const res = await fetch(`/api/attendance/status?courseId=${courseId}`)
            if (res.ok) {
              const data = await res.json()
              progressMap[courseId] = data.progressPercentage || 0
            } else {
              progressMap[courseId] = 0
            }
          } catch {
            progressMap[courseId] = 0
          }
        })
      )
      setAttendanceProgress(progressMap)
    }
    if (enrolledCourses.length > 0) {
      fetchProgress()
    }
  }, [enrolledCourses])

  // Open the filter dialog and initialize temp filters with current applied filters
  const openFilterDialog = () => {
    setTempFilters({...appliedFilters})
    setFilterDialogOpen(true)
  }
  
  // Apply the filters from the dialog
  const applyFilters = () => {
    setAppliedFilters({...tempFilters})
    setFilterDialogOpen(false)
  }
  
  // Clear all filters
  const clearFilters = () => {
    const resetFilters = {
      searchQuery: "",
      durationFilter: "all",
      levelFilter: "all",
      instructorFilter: "all"
    }
    setTempFilters(resetFilters)
    setAppliedFilters(resetFilters)
    setFilterDialogOpen(false)
  }

  // Get unique values for filters
  const uniqueDurations = [...new Set(courses?.map(c => c.duration) || [])]
  const uniqueLevels = [...new Set(courses?.map(c => c.level) || [])]
  const uniqueInstructors = [...new Set(courses?.map(c => c.instructor) || [])]

  // Filter courses based on applied filters
  const filteredCourses = courses?.filter(course => {
    const matchesSearch = !appliedFilters.searchQuery || 
                         course.title.toLowerCase().includes(appliedFilters.searchQuery.toLowerCase()) ||
                         course.description.toLowerCase().includes(appliedFilters.searchQuery.toLowerCase())
    const matchesDuration = appliedFilters.durationFilter === "all" || course.duration.includes(appliedFilters.durationFilter)
    const matchesLevel = appliedFilters.levelFilter === "all" || course.level === appliedFilters.levelFilter
    const matchesInstructor = appliedFilters.instructorFilter === "all" || course.instructor === appliedFilters.instructorFilter
    
    return matchesSearch && matchesDuration && matchesLevel && matchesInstructor
  })

  const openNameDialog = (course: Course) => {
    setSelectedCourse(course)
    setRealName("")
    setNameError("")
    setNameDialogOpen(true)
  }

  const handleRealNameSubmit = async () => {
    if (!selectedCourse) return
    
    // Validate name input
    if (!realName.trim()) {
      setNameError("Please enter your real name")
      return
    }

    // Name validation - allow only letters, spaces, and dots
    const nameRegex = /^[A-Za-z\s.]+$/
    if (!nameRegex.test(realName)) {
      setNameError("Name can only contain letters, spaces, and dots")
      return
    }

    setNameDialogOpen(false)
    
    // Set loading state for this specific course
    setIsEnrolling(prev => ({ ...prev, [selectedCourse.id]: true }))
    
    try {
      // First save the real name to user profile
      const saveNameResponse = await fetch('/api/user/realname', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ realName })
      })
      
      if (!saveNameResponse.ok) {
        throw new Error("Failed to save your real name")
      }
      
      // Then enroll in course
      const success = await enrollInCourse(selectedCourse.id)
      
      if (success) {
        toast({
          title: "Enrolled Successfully",
          description: `You have been enrolled in ${selectedCourse.title}`,
        })
      } else {
        toast({
          title: "Enrollment Failed",
          description: "Failed to enroll in course. Please try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Enrollment error:", error)
      toast({
        title: "Enrollment Failed",
        description: error instanceof Error ? error.message : "An error occurred. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsEnrolling(prev => ({ ...prev, [selectedCourse.id]: false }))
      setSelectedCourse(null)
    }
  }

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <CardHeader className="p-0">
              <Skeleton className="h-32 rounded-none" />
            </CardHeader>
            <CardContent className="p-4">
              <Skeleton className="h-5 w-2/3 mb-2" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-3 w-1/2" />
            </CardContent>
            <CardFooter className="flex justify-between p-4 pt-0">
              <Skeleton className="h-8 w-20" />
            </CardFooter>
          </Card>
        ))}
      </div>
    )
  }

  // Show mock courses if there's an error or empty courses list
  const displayCourses = (courses && courses.length > 0) ? courses : MOCK_COURSES;

  if (!courses?.length) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <h3 className="text-lg font-semibold mb-2">No Courses Available</h3>
        <p className="text-muted-foreground mb-4">
          There are no courses available at the moment. Please check back later.
        </p>
        {isInstructor && (
          <Button asChild className="mt-4">
            <Link href="/dashboard/courses/create">
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Course
            </Link>
          </Button>
        )}
      </div>
    )
  }

  // Check if any filters are active
  const hasActiveFilters = 
    appliedFilters.searchQuery ||
    appliedFilters.durationFilter !== "all" ||
    appliedFilters.levelFilter !== "all" ||
    appliedFilters.instructorFilter !== "all";

  return (
    <div className="space-y-6">
      {/* Search bar and filter button */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search courses..."
            value={appliedFilters.searchQuery}
            onChange={(e) => setAppliedFilters({...appliedFilters, searchQuery: e.target.value})}
            className="pl-8"
          />
        </div>
        <Button 
          onClick={openFilterDialog} 
          variant={hasActiveFilters ? "default" : "outline"}
          className="gap-2"
        >
          <Filter className="h-4 w-4" />
          Filters
          {hasActiveFilters && (
            <Badge variant="outline" className="ml-1 bg-primary/20 text-primary">
              {Object.values(appliedFilters).filter(v => v && v !== "all").length}
            </Badge>
          )}
        </Button>
      </div>
      
      {/* Active filters display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {appliedFilters.searchQuery && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Search: {appliedFilters.searchQuery}
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-4 w-4 p-0 ml-1"
                onClick={() => setAppliedFilters({...appliedFilters, searchQuery: ""})}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          {appliedFilters.durationFilter !== "all" && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Duration: {appliedFilters.durationFilter}
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-4 w-4 p-0 ml-1"
                onClick={() => setAppliedFilters({...appliedFilters, durationFilter: "all"})}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          {appliedFilters.levelFilter !== "all" && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Level: {appliedFilters.levelFilter}
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-4 w-4 p-0 ml-1"
                onClick={() => setAppliedFilters({...appliedFilters, levelFilter: "all"})}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          {appliedFilters.instructorFilter !== "all" && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Instructor: {appliedFilters.instructorFilter}
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-4 w-4 p-0 ml-1"
                onClick={() => setAppliedFilters({...appliedFilters, instructorFilter: "all"})}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 text-xs"
            onClick={clearFilters}
          >
            Clear all
          </Button>
        </div>
      )}

      {/* Course Grid with smaller cards */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {filteredCourses?.map((course) => {
          const isEnrolled = enrolledCourses.includes(course.id)
          const isButtonLoading = isEnrolling[course.id] || loadingEnrollment
          const progress = isEnrolled ? (attendanceProgress[course.id] ?? 0) : 0

          return (
            <Card key={course.id} className="overflow-hidden flex flex-col">
              <CardHeader className="p-0">
                <img 
                  src={course.image || "/placeholder.svg"} 
                  alt={course.title} 
                  className="h-32 w-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = "/placeholder.svg";
                  }}
                />
              </CardHeader>
              <CardContent className="p-4 flex-grow">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <CardTitle className="text-base line-clamp-1">{course.title}</CardTitle>
                  <Badge variant={isEnrolled ? "default" : "outline"} className="text-xs">
                    {isEnrolled ? "Enrolled" : course.level}
                  </Badge>
                </div>
                <CardDescription className="text-xs line-clamp-2 mb-2">{course.description}</CardDescription>
                <div className="text-xs text-muted-foreground">Instructor: {course.instructor}</div>
                {isEnrolled && (
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Progress</span>
                      <span>{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-1" />
                  </div>
                )}
              </CardContent>
              <CardFooter className="p-4 pt-0 flex gap-2 justify-between mt-auto">
                <Button variant="outline" size="sm" asChild className="text-xs">
                  <Link href={`/dashboard/courses/${course.id || ''}`}>Details</Link>
                </Button>
                {!isEnrolled && (
                  <Button 
                    size="sm"
                    onClick={() => openNameDialog(course)} 
                    disabled={isButtonLoading}
                    className="text-xs"
                  >
                    {isButtonLoading ? (
                      <>
                        <span className="mr-1 h-3 w-3 animate-spin rounded-full border-b-2 border-current"></span>
                        Loading
                      </>
                    ) : "Enroll"}
                  </Button>
                )}
              </CardFooter>
            </Card>
          )
        })}
      </div>

      {/* Filter Dialog */}
      <Dialog open={filterDialogOpen} onOpenChange={setFilterDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Filter Courses</DialogTitle>
            <DialogDescription>
              Select filters to narrow down course results
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="searchQuery">Search</Label>
              <Input
                id="searchQuery"
                placeholder="Search by title or description"
                value={tempFilters.searchQuery}
                onChange={(e) => setTempFilters({...tempFilters, searchQuery: e.target.value})}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="durationFilter">Duration</Label>
                <Select 
                  value={tempFilters.durationFilter} 
                  onValueChange={(value) => setTempFilters({...tempFilters, durationFilter: value})}
                >
                  <SelectTrigger id="durationFilter">
                    <SelectValue placeholder="All Durations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Durations</SelectItem>
                    {uniqueDurations.map(duration => (
                      <SelectItem key={duration} value={duration}>{duration}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="levelFilter">Level</Label>
                <Select 
                  value={tempFilters.levelFilter} 
                  onValueChange={(value) => setTempFilters({...tempFilters, levelFilter: value})}
                >
                  <SelectTrigger id="levelFilter">
                    <SelectValue placeholder="All Levels" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    {uniqueLevels.map(level => (
                      <SelectItem key={level} value={level}>{level}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="instructorFilter">Instructor</Label>
              <Select 
                value={tempFilters.instructorFilter} 
                onValueChange={(value) => setTempFilters({...tempFilters, instructorFilter: value})}
              >
                <SelectTrigger id="instructorFilter">
                  <SelectValue placeholder="All Instructors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Instructors</SelectItem>
                  {uniqueInstructors.map(instructor => (
                    <SelectItem key={instructor} value={instructor}>{instructor}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter className="flex justify-between">
            <Button variant="outline" onClick={clearFilters}>
              Reset Filters
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setFilterDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={applyFilters}>
                Apply Filters
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Real Name Dialog */}
      <Dialog open={nameDialogOpen} onOpenChange={setNameDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Enter Your Real Name</DialogTitle>
            <DialogDescription>
              Please provide your real name as it should appear on your certificate upon course completion.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {nameError && (
              <div className="flex items-center gap-2 text-red-500 text-sm">
                <AlertTriangle className="h-4 w-4" />
                <span>{nameError}</span>
              </div>
            )}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="realName" className="text-right">
                Full Name
              </Label>
              <Input
                id="realName"
                value={realName}
                onChange={(e) => setRealName(e.target.value)}
                className="col-span-3"
                placeholder="John Doe"
              />
            </div>
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 rounded-md mt-2">
              <p className="text-sm text-amber-800 dark:text-amber-300 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>This name will be used on your certificate. Please ensure it matches your official identification documents.</span>
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNameDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRealNameSubmit}>
              Continue Enrollment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

