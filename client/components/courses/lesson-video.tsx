"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, PlayCircle, AlertCircle } from "lucide-react"
import type { Lesson } from "@/lib/types"

interface LessonVideoProps {
  lessonTitle: string
  videoPath: string
  currentLesson: Lesson
  nextLesson?: Lesson
  previousLesson?: Lesson
  onNavigate?: (lesson: Lesson) => void
  onClose: () => void
}

export default function LessonVideo({
  lessonTitle,
  videoPath,
  currentLesson,
  nextLesson,
  previousLesson,
  onNavigate,
  onClose,
}: LessonVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Reset video when the lesson changes
    if (videoRef.current) {
      setIsLoading(true)
      setError(null)
      videoRef.current.currentTime = 0
      videoRef.current.play().catch((err) => {

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
          
          {onNavigate && (
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
          )}
        </div>
      </CardContent>
    </Card>
  )
} 