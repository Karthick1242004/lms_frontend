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
import { AlertCircle, CheckCircle, TimerIcon, LockIcon, MaximizeIcon } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface AssessmentPageProps {
  params: Promise<{
    id: string
  }>
}

export default function AssessmentPage({ params }: AssessmentPageProps) {
  const router = useRouter()
  const { toast } = useToast()
  const resolvedParams = React.use(params)
  const courseId = resolvedParams.id
  
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
  
  // Reset selected option when question changes
  useEffect(() => {
    setSelectedOption(null)
  }, [currentQuestionIndex])
  
  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isDocFullscreen = Boolean(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      )
      
      setIsFullscreen(isDocFullscreen)
      
      // If exited fullscreen (except at the beginning)
      if (!isDocFullscreen && fullscreenExitCount > 0) {
        const newExitCount = fullscreenExitCount + 1
        setFullscreenExitCount(newExitCount)
        
        toast({
          title: `Fullscreen Exit Warning (${newExitCount}/3)`,
          description: newExitCount >= 3 
            ? "You have exited fullscreen too many times. Assessment will restart." 
            : "Please return to fullscreen mode to continue the assessment.",
          variant: "destructive",
          duration: 5000,
        })
        
        if (newExitCount >= 3) {
          setNeedsRestart(true)
        }
      }
    }
    
    document.addEventListener("fullscreenchange", handleFullscreenChange)
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange)
    document.addEventListener("mozfullscreenchange", handleFullscreenChange)
    document.addEventListener("MSFullscreenChange", handleFullscreenChange)
    
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange)
      document.removeEventListener("mozfullscreenchange", handleFullscreenChange)
      document.removeEventListener("MSFullscreenChange", handleFullscreenChange)
    }
  }, [fullscreenExitCount, toast])
  
  // Timer for each question
  useEffect(() => {
    if (!isFullscreen || needsRestart || assessmentComplete || isLoading || error) {
      return
    }
    
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }
    
    // Reset timer when moving to a new question
    setTimeLeft(60)
    
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        // If time is up, move to the next question
        if (prev <= 1) {
          // Save the current answer (or mark as unanswered)
          const currentQuestion = assessment?.questions[currentQuestionIndex]
          if (currentQuestion) {
            handleAnswerSubmit(true)
          }
          return 60
        }
        return prev - 1
      })
    }, 1000)
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [currentQuestionIndex, isFullscreen, needsRestart, assessmentComplete, isLoading, error, assessment])
  
  // Request fullscreen
  const enterFullscreen = () => {
    if (pageRef.current) {
      if (pageRef.current.requestFullscreen) {
        pageRef.current.requestFullscreen()
      } else if ((pageRef.current as any).webkitRequestFullscreen) {
        (pageRef.current as any).webkitRequestFullscreen()
      } else if ((pageRef.current as any).mozRequestFullScreen) {
        (pageRef.current as any).mozRequestFullScreen()
      } else if ((pageRef.current as any).msRequestFullscreen) {
        (pageRef.current as any).msRequestFullscreen()
      }
      
      // Initialize fullscreen exit count only after first entering
      if (fullscreenExitCount === 0) {
        setFullscreenExitCount(1)
      }
    }
  }
  
  // Restart the assessment
  const restartAssessment = () => {
    setCurrentQuestionIndex(0)
    setAnswers([])
    setSelectedOption(null)
    setTimeLeft(60)
    setAssessmentComplete(false)
    setResults(null)
    setNeedsRestart(false)
    setFullscreenExitCount(1) // Reset but maintain that we've entered once
    
    // Re-enter fullscreen
    enterFullscreen()
  }
  
  // Handle question navigation
  const handleAnswerSubmit = (timeExpired = false) => {
    const currentQuestion = assessment?.questions[currentQuestionIndex]
    
    if (currentQuestion) {
      // Capture the current answer
      const answer = {
        questionId: currentQuestion.id,
        answer: selectedOption !== null ? selectedOption : -1 // -1 for unanswered
      }
      
      // Save the answer
      setAnswers(prev => {
        const newAnswers = [...prev]
        const existingIndex = newAnswers.findIndex(a => a.questionId === answer.questionId)
        
        if (existingIndex >= 0) {
          newAnswers[existingIndex] = answer
        } else {
          newAnswers.push(answer)
        }
        
        return newAnswers
      })
      
      // Show toast for time expired
      if (timeExpired && selectedOption === null) {
        toast({
          title: "Time Expired",
          description: "You didn't answer in time. Moving to the next question.",
          variant: "destructive",
        })
      }
      
      // Move to next question or complete the assessment
      if (currentQuestionIndex < assessment.questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1)
        setSelectedOption(null) // Reset selection for next question
      } else {
        // End of assessment
        submitAssessment([...answers, answer])
      }
    }
  }
  
  // Submit the entire assessment
  const submitAssessment = async (finalAnswers: {questionId: string, answer: number}[]) => {
    try {
      setIsSubmitting(true)
      
      const response = await fetch(`/api/courses/${courseId}/assessment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          answers: finalAnswers
        })
      })
      
      if (!response.ok) {
        throw new Error("Failed to submit assessment")
      }
      
      const data = await response.json()
      setResults(data)
      setAssessmentComplete(true)
      
      // Clear timer
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    } catch (error) {
      console.error("Error submitting assessment:", error)
      toast({
        title: "Submission Failed",
        description: "Failed to submit your assessment. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }
  
  // If loading
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <CardTitle>Loading Assessment...</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center p-6">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  // If error
  if (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to load assessment"
    
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-destructive flex items-center justify-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Assessment Unavailable
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
            <p className="text-center mb-4">
              You may need to complete all lessons before taking the assessment.
            </p>
            <div className="flex justify-center">
              <Button onClick={() => router.push(`/dashboard/courses/${courseId}`)}>
                Return to Course
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  // Fullscreen request view
  if (!isFullscreen && !assessmentComplete) {
    return (
      <div ref={pageRef} className="flex flex-col items-center justify-center min-h-screen p-6">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <CardTitle>Assessment for {assessment?.title}</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <div className="flex justify-center mb-4">
                <MaximizeIcon className="h-16 w-16 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Fullscreen Required</h3>
              <p className="mb-4">
                This assessment must be taken in fullscreen mode. You will have 1 minute to answer each question.
              </p>
              <div className="bg-muted p-4 rounded-md space-y-2 text-left">
                <p className="font-medium">Assessment Rules:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Each question has a 1-minute time limit</li>
                  <li>Questions must be answered in order</li>
                  <li>You cannot go back to previous questions</li>
                  <li>Exiting fullscreen more than 3 times will restart the assessment</li>
                  <li>You need to score 75% or higher to pass</li>
                </ul>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-center pb-6">
            <Button onClick={enterFullscreen} className="gap-2">
              <MaximizeIcon className="h-4 w-4" />
              Enter Fullscreen to Begin
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }
  
  // Needs restart view
  if (needsRestart && !assessmentComplete) {
    return (
      <div ref={pageRef} className="flex flex-col items-center justify-center min-h-screen p-6 bg-background">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-destructive">Assessment Paused</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <div className="flex justify-center mb-4">
                <LockIcon className="h-16 w-16 text-destructive" />
              </div>
              <h3 className="text-lg font-semibold">Fullscreen Exited Too Many Times</h3>
              <p className="mb-4">
                You have exited fullscreen mode {fullscreenExitCount} times. The assessment must be restarted.
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-center pb-6">
            <Button onClick={restartAssessment} variant="default">
              Restart Assessment
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }
  
  // Assessment results view
  if (assessmentComplete && results) {
    return (
      <div ref={pageRef} className="flex flex-col items-center justify-center min-h-screen p-6 bg-background">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <CardTitle>Assessment {results.passed ? "Passed!" : "Failed"}</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="text-center space-y-6">
              <div className="flex justify-center mb-4">
                {results.passed ? (
                  <CheckCircle className="h-16 w-16 text-green-500" />
                ) : (
                  <AlertCircle className="h-16 w-16 text-destructive" />
                )}
              </div>
              
              <div className="space-y-2">
                <p className="text-2xl font-bold">Your Score: {results.score}%</p>
                <p className="text-muted-foreground">
                  You answered {results.correctAnswers} out of {results.totalQuestions} questions correctly.
                </p>
              </div>
              
              <div className="w-full bg-muted rounded-full h-3">
                <div 
                  className={`h-3 rounded-full ${results.passed ? "bg-green-500" : "bg-destructive"}`}
                  style={{ width: `${results.score}%` }}
                ></div>
              </div>
              
              <div className="bg-muted p-4 rounded-md">
                <p>
                  {results.passed 
                    ? "Congratulations! You have successfully passed this assessment. A certificate has been added to your profile."
                    : "Unfortunately, you did not reach the passing score of 75%. Please review the course material and try again."}
                </p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-center gap-4 pb-6">
            <Button variant="outline" onClick={() => router.push(`/dashboard/courses/${courseId}`)}>
              Return to Course
            </Button>
            {!results.passed && (
              <Button onClick={restartAssessment}>
                Try Again
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    )
  }
  
  // Assessment question view
  const currentQuestion = assessment?.questions[currentQuestionIndex]
  
  return (
    <div ref={pageRef} className="flex flex-col items-center justify-center min-h-screen p-6 bg-background">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">
              Question {currentQuestionIndex + 1} of {assessment?.questions.length}
            </span>
            <div className="flex items-center gap-2">
              <TimerIcon className="h-4 w-4" />
              <span className="text-sm font-medium">
                {timeLeft} seconds
              </span>
            </div>
          </div>
          <Progress 
            value={(timeLeft / 60) * 100} 
            className={`h-2 ${timeLeft <= 10 ? "bg-red-100" : ""}`}
          />
          <div className={`h-2 ${timeLeft <= 10 ? "bg-red-100" : ""}`}>
            <div 
              className={`h-2 transition-all duration-1000 ${timeLeft <= 10 ? "bg-destructive" : "bg-primary"}`}
              style={{ width: `${(timeLeft / 60) * 100}%` }}
            ></div>
          </div>
        </CardHeader>
        
        <CardContent className="p-6">
          <div className="space-y-6">
            <h3 className="text-lg font-medium">{currentQuestion?.question}</h3>
            
            <RadioGroup
              value={selectedOption !== null ? String(selectedOption) : undefined}
              onValueChange={(value) => setSelectedOption(parseInt(value))}
              className="space-y-3"
            >
              {currentQuestion?.options.map((option, index) => (
                <div
                  key={index}
                  className="flex items-center space-x-2 rounded-md border p-3 transition-colors hover:bg-accent"
                >
                  <RadioGroupItem value={String(index)} id={`option-${index}`} />
                  <Label htmlFor={`option-${index}`} className="flex-grow cursor-pointer">
                    {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-between p-6 pt-0">
          <div className="text-sm text-muted-foreground">
            {selectedOption === null 
              ? "Select an answer" 
              : "Answer selected"}
          </div>
          
          <Button 
            onClick={() => handleAnswerSubmit(false)}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-current"></span>
                Submitting...
              </>
            ) : currentQuestionIndex < assessment.questions.length - 1 ? (
              "Next Question"
            ) : (
              "Submit Assessment"
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
} 