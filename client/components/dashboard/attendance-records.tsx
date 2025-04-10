"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { useStore } from "@/lib/store"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Activity, Check, Clock, Play, User, Filter } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function AttendanceRecords() {
  const { attendanceRecords, fetchAttendanceRecords, isLoading } = useStore()
  const [filterCourse, setFilterCourse] = useState<string | null>(null)
  const [uniqueCourses, setUniqueCourses] = useState<string[]>([])

  useEffect(() => {
    fetchAttendanceRecords()
  }, [fetchAttendanceRecords])

  // Extract unique course IDs from the attendance records
  useEffect(() => {
    if (attendanceRecords.length > 0) {
      const courses = [...new Set(attendanceRecords.map(record => record.courseId))]
      setUniqueCourses(courses)
    }
  }, [attendanceRecords])

  // Filter the records based on the selected course
  const filteredRecords = filterCourse && filterCourse !== "all"
    ? attendanceRecords.filter(record => record.courseId === filterCourse)
    : attendanceRecords

  // Function to format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  // Function to format duration in minutes
  const formatDuration = (seconds: number) => {
    if (!seconds) return '0 min'
    const minutes = Math.floor(seconds / 60)
    return `${minutes} min`
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Attendance Records
            </CardTitle>
            <CardDescription>
              View your attendance and video completion records
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2">
            <Select
              value={filterCourse || ''}
              onValueChange={(value) => setFilterCourse(value || null)}
            >
              <SelectTrigger className="w-[180px]">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  <SelectValue placeholder="Filter by course" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Courses</SelectItem>
                {uniqueCourses.map((courseId) => (
                  <SelectItem key={courseId} value={courseId}>
                    Course {courseId.slice(0, 8)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => fetchAttendanceRecords(filterCourse || undefined)}
              disabled={isLoading}
            >
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : attendanceRecords.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No attendance records found</p>
            <p className="text-sm text-muted-foreground">
              Start watching lectures to see your attendance records here
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lesson</TableHead>
                  <TableHead>Start Time</TableHead>
                  <TableHead>End Time</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Attention Events</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((record, index) => {
                  const progressPercentage = record.totalDuration
                    ? Math.min(100, Math.round((record.watchedDuration / record.totalDuration) * 100))
                    : 0
                  
                  return (
                    <TableRow key={`${record.lessonId}-${index}`}>
                      <TableCell className="font-medium">{record.lessonId}</TableCell>
                      <TableCell>{formatDate(record.startTime)}</TableCell>
                      <TableCell>
                        {record.endTime ? formatDate(record.endTime) : "Not completed"}
                      </TableCell>
                      <TableCell>
                        <div className="w-32">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-muted-foreground">
                              {formatDuration(record.watchedDuration)} / {formatDuration(record.totalDuration)}
                            </span>
                            <span className="text-xs font-medium">{progressPercentage}%</span>
                          </div>
                          <Progress value={progressPercentage} />
                        </div>
                      </TableCell>
                      <TableCell>
                        {record.completed ? (
                          <Badge variant="default" className="flex items-center gap-1">
                            <Check className="h-3 w-3" />
                            Completed
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            In Progress
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {record.attentionEvents && record.attentionEvents.length > 0 ? (
                          <div className="text-xs text-muted-foreground">
                            {record.attentionEvents.filter(
                              (e: any) => e.eventType !== 'heartbeat'
                            ).length} attention events
                          </div>
                        ) : (
                          <div className="text-xs text-muted-foreground">No issues</div>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 