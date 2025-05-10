"use client"

import React, { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { AlertCircle, CheckCircle, TimerIcon, LockIcon, MaximizeIcon, Award } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import CertificateModal from "@/components/certificate/certificate-modal"
import { generateCertificateId } from "@/lib/utils"

interface AssessmentPageProps {
  params: Promise<{
    courseId: string
  }>
}

interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
}

export default function AssessmentPage({ params }: AssessmentPageProps) {
  const router = useRouter()
  const { toast } = useToast()
  const resolvedParams = React.use(params)
  const courseId = resolvedParams.courseId
  
  // States
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [fullscreenExitCount, setFullscreenExitCount] = useState(0)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<{questionId: string, answer: number}[]>([])
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [timeLeft, setTimeLeft] = useState(60) // 60 seconds per question
  const [assessmentComplete, setAssessmentComplete] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [needsRestart, setNeedsRestart] = useState(false)
  const [showReview, setShowReview] = useState(false)
  const [showCertificate, setShowCertificate] = useState(false)
  
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const pageRef = useRef<HTMLDivElement>(null)
  
  // Fetch assessment questions
  const {
    data: assessment,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["assessment", courseId],
    queryFn: async () => {
      const response = await fetch(`/api/courses/${courseId}/assessment`)
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to fetch assessment")
      }
      return response.json()
    },
  })
  
  // Add a new query to fetch course details
  const { 
    data: courseDetails,
    refetch: refetchCourseDetails
  } = useQuery({
    queryKey: ["course-details", courseId],
    queryFn: async () => {
      const response = await fetch(`/api/courses/${courseId}`)
      if (!response.ok) {
        console.error("Failed to fetch course details:", await response.text())
        return null
      }
      return response.json()
    },
    enabled: !!courseId,
    retry: 2
  })
  
  // Add a new query to fetch user details
  const {
    data: userDetails,
    refetch: refetchUserDetails
  } = useQuery({
    queryKey: ["user-details"],
    queryFn: async () => {
      const response = await fetch('/api/user')
      if (!response.ok) {
        console.error("Failed to fetch user details:", await response.text())
        return null
      }
      return response.json()
    },
    retry: 2
  })
  
  // Reset selected option when question changes
  useEffect(() => {
    setSelectedOption(null)
  }, [currentQuestionIndex])
  
  // Submit assessment function
  const submitAssessment = async (finalAnswers: {questionId: string, answer: number}[]) => {
    if (isSubmitting) return
    
    setIsSubmitting(true)
    
    try {
      const response = await fetch(`/api/courses/${courseId}/assessment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: finalAnswers }),
      })
      
      if (!response.ok) {
        throw new Error("Failed to submit assessment")
      }
      
      const result = await response.json()
      setResults(result)
      
      // Refresh course details to get updated certificate status
      refetchCourseDetails()
      refetchUserDetails()
      
      if (result.passed) {
        toast({
          title: "Congratulations!",
          description: `You passed the assessment with a score of ${result.score}%!`,
          variant: "default",
        })
      } else {
        toast({
          title: "Assessment Complete",
          description: `Your score: ${result.score}%. You need 75% to pass.`,
          variant: "default",
        })
      }
    } catch (error) {
      console.error("Error submitting assessment:", error)
      toast({
        title: "Error",
        description: "Failed to submit assessment. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }
  
  // Handle the rest of the component rendering and logic (same as before)
  // ...
  
  return (
    <div ref={pageRef} className="min-h-screen bg-background">
      {/* UI implementation goes here */}
      <div className="pt-6 pb-8 px-6 md:px-10">
        {assessment && assessment.questions && !needsRestart && !assessmentComplete ? (
          <Button 
            className="mb-4"
            onClick={() => router.push(`/dashboard/courses/${courseId}`)}
          >
            Return to Course
          </Button>
        ) : null}
      </div>
    </div>
  )
} 