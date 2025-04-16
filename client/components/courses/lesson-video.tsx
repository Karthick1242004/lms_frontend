"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, PlayCircle, AlertCircle } from "lucide-react"
import type { Lesson } from "@/lib/types"
import { useToast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"

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
  const [tabSwitchCount, setTabSwitchCount] = useState(0)
  const [maxPlaybackTime, setMaxPlaybackTime] = useState(0)
  const [needsRestart, setNeedsRestart] = useState(false)
  const previousTimeRef = useRef(0)

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

  // Tab visibility change handler
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // User switched away from the tab
        if (videoRef.current && isPlaying) {
          videoRef.current.pause()
          setIsPlaying(false)
          
          // Use a functional update to ensure we have the latest state
          setTabSwitchCount(prevCount => {
            const newCount = prevCount + 1;
            
            // Handle the toast and restart flag inside the updater function
            // to ensure we're using the correct count
            setTimeout(() => {
              toast({
                title: `Tab Switch Warning (${newCount}/5)`,
                description: newCount >= 5 
                  ? "You've switched tabs too many times. Video will restart." 
                  : `Please stay on this tab. ${5 - newCount} switches remaining.`,
                variant: newCount >= 5 ? "destructive" : "default",
                duration: 5000,
              })
              
              // If reached max tab switches, flag for restart
              if (newCount >= 5) {
                setNeedsRestart(true)
              }
            }, 0);
            
            return newCount;
          });
        }
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [isPlaying, toast])

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

  // Handle restart if needed
  useEffect(() => {
    if (needsRestart && videoRef.current) {
      videoRef.current.currentTime = 0
      setMaxPlaybackTime(0)
      setNeedsRestart(false)
      setTabSwitchCount(0)
      
      toast({
        title: "Video Restarted",
        description: "You switched tabs too many times. The video has been restarted.",
        variant: "destructive",
        duration: 5000,
      })
    }
  }, [needsRestart, toast])

  // Track video time updates
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const currentVideoTime = videoRef.current.currentTime
      setCurrentTime(currentVideoTime)
      
      // If the video is playing, update the max playback time
      if (isPlaying) {
        // Only update max time if the playback is progressing naturally
        if (currentVideoTime > previousTimeRef.current && currentVideoTime - previousTimeRef.current < 1.5) {
          setMaxPlaybackTime(prevMax => Math.max(prevMax, currentVideoTime))
        }
        // If the user is trying to fast-forward past the allowed limit
        else if (currentVideoTime > maxPlaybackTime + 1) {
          // Prevent fast-forwarding by resetting to the maximum allowed time
          videoRef.current.currentTime = maxPlaybackTime
          
          // Use setTimeout to avoid state updates during render
          setTimeout(() => {
            toast({
              title: "Fast-forwarding Disabled",
              description: "You cannot skip ahead in the video.",
              variant: "default",
              duration: 3000,
            })
          }, 0)
        }
      }
      
      previousTimeRef.current = videoRef.current.currentTime
    }
  }

  // When video metadata is loaded, set the duration
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration)
    }
  }

  // Handle playback rate change attempt
  const handleRateChange = () => {
    if (videoRef.current && videoRef.current.playbackRate > 1) {
      videoRef.current.playbackRate = 1
      
      // Use setTimeout to avoid state updates during render
      setTimeout(() => {
        toast({
          title: "Playback Speed Limited",
          description: "You cannot increase the playback speed above 1x.",
          variant: "default",
          duration: 3000,
        })
      }, 0)
    }
  }

  useEffect(() => {
    // Reset video when the lesson changes
    if (videoRef.current) {
      setIsLoading(true)
      setError(null)
      setTabSwitchCount(0)
      setMaxPlaybackTime(0)
      setNeedsRestart(false)
      previousTimeRef.current = 0
      
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
        // If the video needs to be restarted due to tab switches, reset it
        if (needsRestart) {
          videoRef.current.currentTime = 0
          setMaxPlaybackTime(0)
          setNeedsRestart(false)
          setTabSwitchCount(0)
        }
        
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

  // Prevent seeking ahead
  const handleSeeking = () => {
    if (videoRef.current && videoRef.current.currentTime > maxPlaybackTime + 1) {
      videoRef.current.currentTime = maxPlaybackTime
      
      // Use setTimeout to avoid state updates during render
      setTimeout(() => {
        toast({
          title: "Fast-forwarding Disabled",
          description: "You cannot skip ahead in the video.",
          variant: "default",
          duration: 3000,
        })
      }, 0)
    }
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

          {needsRestart && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 z-10">
              <AlertCircle className="h-12 w-12 text-destructive mb-4" />
              <p className="text-destructive mb-4">You've switched tabs too many times.</p>
              <Button 
                onClick={() => {
                  if (videoRef.current) {
                    videoRef.current.currentTime = 0
                    setMaxPlaybackTime(0)
                    setNeedsRestart(false)
                    setTabSwitchCount(0)
                    videoRef.current.play().catch(() => {
                      setError("Failed to play video. Please try again.")
                    })
                    setIsPlaying(true)
                  }
                }}
              >
                Restart Video
              </Button>
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
            onSeeking={handleSeeking}
            onRateChange={handleRateChange}
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
            
            {tabSwitchCount > 0 && (
              <Badge 
                variant={tabSwitchCount >= 4 ? "destructive" : "secondary"} 
                className="bg-background/80 backdrop-blur-sm"
              >
                Tab Switches: {tabSwitchCount}/5
              </Badge>
            )}
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
              disabled={!nextLesson || needsRestart}
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