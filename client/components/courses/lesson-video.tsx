"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, PlayCircle, AlertCircle } from "lucide-react"
import type { Lesson } from "@/lib/types"
import { useToast } from "@/components/ui/use-toast"

interface LessonVideoProps {
  lessonTitle: string
  videoPath: string
  currentLesson: Lesson
  nextLesson?: Lesson
  previousLesson?: Lesson
  onNavigate: (lesson: Lesson) => void
  onClose: () => void
  courseId: string
  moduleIndex: number
  lessonIndex: number
}

export default function LessonVideo({
  lessonTitle,
  videoPath,
  currentLesson,
  nextLesson,
  previousLesson,
  onNavigate,
  onClose,
  courseId,
  moduleIndex,
  lessonIndex,
}: LessonVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const { toast } = useToast()

  // Send heartbeat to server to track attendance
  const sendHeartbeat = useCallback(async () => {
    if (!videoRef.current) return
    
    try {
      const response = await fetch('/api/attendance/heartbeat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          courseId,
          moduleIndex,
          lessonIndex,
          currentTime: videoRef.current.currentTime,
          totalDuration: videoRef.current.duration,
        }),
      })
      
      if (response.ok) {
        const data = await response.json()
        
        // If video is almost completed (>= 90%), show a toast
        if (data.status === "completed" && data.percentageWatched >= 90) {
          toast({
            title: "Progress Saved",
            description: "This lesson has been marked as completed!",
            duration: 3000,
          })
        }
      }
    } catch (err) {
      console.error("Failed to send heartbeat:", err)
    }
  }, [courseId, moduleIndex, lessonIndex, toast])

  // Setup heartbeat interval (every 10 seconds)
  useEffect(() => {
    if (isPlaying && videoRef.current) {
      // Send initial heartbeat
      sendHeartbeat()
      
      // Set up interval for heartbeats
      heartbeatIntervalRef.current = setInterval(() => {
        sendHeartbeat()
      }, 10000) // Send heartbeat every 10 seconds
    }
    
    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current)
        heartbeatIntervalRef.current = null
      }
    }
  }, [isPlaying, sendHeartbeat])

  // Send final heartbeat when component unmounts
  useEffect(() => {
    return () => {
      sendHeartbeat()
    }
  }, [sendHeartbeat])

  // Track video time updates
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime)
    }
  }

  // When video metadata is loaded, set the duration
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration)
    }
  }

  useEffect(() => {
    // Reset video when the lesson changes
    if (videoRef.current) {
      setIsLoading(true)
      setError(null)
      videoRef.current.currentTime = 0
      videoRef.current.play().catch((err) => {
        console.error("Error playing video:", err)
        setError("Failed to play video. Please try again.")
        setIsPlaying(false)
      })
    }
  }, [currentLesson])

  const handleVideoPlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play().catch((err) => {
          console.error("Error playing video:", err)
          setError("Failed to play video. Please try again.")
        })
      }
      setIsPlaying(!isPlaying)
    }
  }

  const handleVideoLoadStart = () => {
    setIsLoading(true)
    setError(null)
  }

  const handleVideoLoadedData = () => {
    setIsLoading(false)
    setError(null)
  }

  const handleVideoError = () => {
    setIsLoading(false)
    setError("Failed to load video. Please try again.")
  }

  // Calculate progress percentage
  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <Card className="w-full">
      <CardContent className="p-0">
        <div className="relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          )}
          
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80">
              <AlertCircle className="h-12 w-12 text-destructive mb-4" />
              <p className="text-destructive mb-4">{error}</p>
              <Button onClick={() => window.location.reload()}>Try Again</Button>
            </div>
          )}

          <video
            ref={videoRef}
            className="w-full aspect-video"
            src={videoPath}
            controls
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onLoadStart={handleVideoLoadStart}
            onLoadedData={handleVideoLoadedData}
            onError={handleVideoError}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={() => sendHeartbeat()}
          />
          
          <div className="absolute top-4 left-4 right-4 flex justify-between items-center">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onClose} 
              className="bg-background/80 backdrop-blur-sm"
            >
              Back to Syllabus
            </Button>
          </div>
        </div>
        
        <div className="p-6 space-y-4">
          <h2 className="text-2xl font-bold">{lessonTitle}</h2>
          
          <div className="flex justify-between mt-4">
            <Button 
              variant="outline" 
              onClick={() => previousLesson && onNavigate(previousLesson)}
              disabled={!previousLesson}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Previous Lesson
            </Button>
            
            <Button 
              onClick={() => nextLesson && onNavigate(nextLesson)}
              disabled={!nextLesson}
            >
              Next Lesson
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 