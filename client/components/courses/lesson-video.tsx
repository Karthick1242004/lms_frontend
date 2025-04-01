"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, PlayCircle } from "lucide-react"
import type { Lesson } from "@/lib/types"

interface LessonVideoProps {
  lessonTitle: string
  videoPath: string
  currentLesson: Lesson
  nextLesson?: Lesson
  previousLesson?: Lesson
  onNavigate: (lesson: Lesson) => void
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

  useEffect(() => {
    // Reset video when the lesson changes
    if (videoRef.current) {
      videoRef.current.currentTime = 0
      videoRef.current.play().catch(() => {
        // Auto-play may be blocked
        setIsPlaying(false)
      })
    }
  }, [currentLesson])

  const handleVideoPlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play().catch(() => {
          // Handle potential auto-play restrictions
        })
      }
      setIsPlaying(!isPlaying)
    }
  }

  return (
    <Card className="w-full">
      <CardContent className="p-0">
        <div className="relative">
          <video
            ref={videoRef}
            className="w-full aspect-video"
            src={videoPath}
            controls
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
          <div className="absolute top-4 left-4 right-4 flex justify-between items-center">
            <Button variant="outline" size="sm" onClick={onClose} className="bg-background/80 backdrop-blur-sm">
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