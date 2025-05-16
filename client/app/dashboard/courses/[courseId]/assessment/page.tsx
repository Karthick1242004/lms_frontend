"use client"

import React, { useState, useEffect, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
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
  params: {
    courseId: string
  }
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
  
  // Access the courseId parameter using the useParams hook
  const routeParams = useParams()
  const courseId = routeParams.courseId as string
  
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
      
      // If passed, ensure we have the necessary data for certificate
      if (data.passed) {
      refetchCourseDetails()
      refetchUserDetails()
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
  
  // Get current question status (answered, skipped, etc.)
  const getQuestionStatus = (index: number) => {
    if (index > currentQuestionIndex) return "upcoming";
    if (index === currentQuestionIndex) return "current";
    
    const question = assessment?.questions[index];
    if (!question) return "unknown";
    
    const answer = answers.find(a => a.questionId === question.id);
    if (!answer) return "unknown";
    
    return answer.answer >= 0 ? "answered" : "skipped";
  }

  // Get status class for question tiles
  const getStatusClass = (status: string) => {
    switch (status) {
      case "answered": return "bg-primary text-primary-foreground";
      case "skipped": return "bg-amber-500 text-white";
      case "current": return "bg-accent text-accent-foreground ring-2 ring-primary";
      default: return "bg-muted text-muted-foreground";
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
    // Add logging to debug
    console.log("Assessment results:", results);
    console.log("Show certificate condition:", results.passed);
    console.log("Course details:", courseDetails);
    console.log("User details:", userDetails);
    
    if (showReview) {
      return (
        <div ref={pageRef} className="flex flex-col items-center justify-center min-h-screen p-6 bg-background overflow-auto">
          <Card className="w-full max-w-4xl">
            <CardHeader className="text-center border-b">
              <CardTitle>Review Assessment</CardTitle>
              <p className="text-muted-foreground">
                Your Score: {results.score}% ({results.passed ? "Passed" : "Failed"})
              </p>
            </CardHeader>
            <CardContent className="p-6 max-h-[70vh] overflow-y-auto">
              <div className="space-y-8">
                {assessment?.questions.map((question: Question, index: number) => {
                  const userAnswer = answers.find(a => a.questionId === question.id);
                  const userAnswerIndex = userAnswer ? userAnswer.answer : -1;
                  const isCorrect = userAnswerIndex === question.correctAnswer;
                  
                  return (
                    <div key={index} className="space-y-4 pb-6 border-b last:border-0">
                      <div className="flex gap-2 items-start">
                        <div className={`flex items-center justify-center h-6 w-6 rounded-full text-xs font-medium ${
                          isCorrect ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                        }`}>
                          {index + 1}
                        </div>
                        <h3 className="text-lg font-medium">{question.question}</h3>
                      </div>
                      
                      <div className="pl-8 space-y-3">
                        {question.options.map((option: string, optIndex: number) => (
                          <div
                            key={optIndex}
                            className={`flex items-center p-3 rounded-md border ${
                              optIndex === question.correctAnswer 
                                ? "border-green-500 bg-green-50" 
                                : optIndex === userAnswerIndex && optIndex !== question.correctAnswer
                                  ? "border-red-500 bg-red-50"
                                  : ""
                            }`}
                          >
                            <div className="flex-shrink-0 w-6 mr-3">
                              {optIndex === question.correctAnswer ? (
                                <CheckCircle className="h-5 w-5 text-green-500" />
                              ) : optIndex === userAnswerIndex && optIndex !== question.correctAnswer ? (
                                <AlertCircle className="h-5 w-5 text-red-500" />
                              ) : null}
                            </div>
                            <span className={`text-sm ${
                              optIndex === question.correctAnswer ? "font-medium text-green-700" : 
                              optIndex === userAnswerIndex && optIndex !== question.correctAnswer ? "text-red-700" : ""
                            }`}>
                              {option}
                            </span>
                          </div>
                        ))}
                        
                        {userAnswerIndex === -1 && (
                          <div className="text-amber-500 text-sm italic pl-2">Question was not answered</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
            <CardFooter className="flex justify-center border-t p-6">
              <Button onClick={() => setShowReview(false)}>
                Back to Results
              </Button>
            </CardFooter>
          </Card>
        </div>
      );
    }
    
    return (
      <div ref={pageRef} className="flex flex-col items-center min-h-screen justify-center p-6 bg-background overflow-auto">
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
              
              <div className="space-y-2 items-center align-middle">
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
              
              {/* {results.passed && (
                <Button
                  onClick={() => setShowCertificate(true)}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <Award className="mr-2 h-5 w-5" />
                  View & Download Certificate
                </Button>
              )} */}
              
              <Button 
                onClick={() => setShowReview(true)} 
                variant="outline" 
                className="w-full"
              >
                Review Your Answers
              </Button>
            </div>
          </CardContent>
          <CardFooter className="flex justify-center gap-4 pb-6 flex-wrap">
            <Button variant="outline" onClick={() => router.push(`/dashboard/courses/${courseId}`)}>
              Return to Course
            </Button>
            
            {/* Debug Certificate Button - Always shown if passed */}
            {/* {results.passed && (
              <Button 
                onClick={() => {
                  console.log("Debug Certificate Button Clicked");
                  console.log("Course ID:", courseId);
                  console.log("User Details:", userDetails);
                  console.log("Course Details:", courseDetails);
                  
                  // Force refetch data
                  refetchCourseDetails();
                  refetchUserDetails();
                  
                  // Force show certificate modal after a short delay
                  setTimeout(() => {
                    setShowCertificate(true);
                  }, 500);
                }}
                className="bg-purple-600 hover:bg-purple-700"
              >
                Debug: Download Certificate
              </Button>
            )} */}
            
            {!results.passed && (
              <Button onClick={restartAssessment}>
                Try Again
              </Button>
            )}
          </CardFooter>
        </Card>
        
        {/* Debug info - Output info about cert availability */}
        {/* {results.passed && (
          <div className="mt-4 p-4 border rounded-md bg-slate-50 dark:bg-slate-900 w-full max-w-2xl text-sm">
            <h3 className="font-bold mb-2">Debug Information:</h3>
            <p>Certificate Button Should Show: {results.passed ? 'Yes' : 'No'}</p>
            <p>User Data Loaded: {userDetails ? 'Yes' : 'No'}</p>
            <p>Course Data Loaded: {courseDetails ? 'Yes' : 'No'}</p>
            <p>Certificate Modal State: {showCertificate ? 'Open' : 'Closed'}</p>
            <p>Score: {results.score}% (Passing: 75%)</p>
          </div>
        )} */}
        
        {/* Certificate Modal */}
        {showCertificate && (
          <CertificateModal
            isOpen={showCertificate}
            onClose={() => setShowCertificate(false)}
            userName={userDetails?.realName || userDetails?.name || "Student Name"}
            courseName={courseDetails?.title || "Course Title"}
            instructorName={courseDetails?.instructor || "Instructor"}
            completionDate={new Date()}
            certificateId={generateCertificateId(userDetails?.id || "user", courseId)}
            courseId={courseId}
          />
        )}
      </div>
    )
  }
  
  // Assessment question view
  const currentQuestion = assessment?.questions[currentQuestionIndex]
  
  return (
    <div ref={pageRef} className="flex flex-col items-center justify-center min-h-screen p-6 bg-background overflow-auto">
      <div className="w-full max-w-5xl flex gap-6">
        {/* Question tiles sidebar */}
        <div className="hidden md:block w-48 flex-shrink-0">
          <div className="bg-card rounded-md border shadow p-4">
            <h3 className="text-sm font-medium mb-3">Questions</h3>
            <div className="grid grid-cols-4 gap-2">
              {assessment?.questions.map((question: Question, index: number) => {
                const status = getQuestionStatus(index);
                return (
                  <div
                    key={index}
                    className={`flex items-center justify-center h-10 w-10 rounded-md text-sm font-medium cursor-not-allowed ${getStatusClass(status)}`}
                    title={`Question ${index + 1} (${status})`}
                  >
                    {index + 1}
                  </div>
                );
              })}
            </div>
            
            <div className="mt-4 space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-primary"></div>
                <span>Answered</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-amber-500"></div>
                <span>Skipped</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-accent ring-1 ring-primary"></div>
                <span>Current</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-muted"></div>
                <span>Upcoming</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Question card */}
        <Card className="flex-1">
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
            
            {/* Mobile question tiles */}
            <div className="flex md:hidden gap-1 overflow-x-auto pb-2 mb-2">
              {assessment?.questions.map((question: Question, index: number) => {
                const status = getQuestionStatus(index);
                return (
                  <div
                    key={index}
                    className={`flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-md text-xs font-medium ${getStatusClass(status)}`}
                  >
                    {index + 1}
                  </div>
                );
              })}
            </div>
            
            <Progress 
              value={(timeLeft / 60) * 100} 
              className={`h-2 ${timeLeft <= 10 ? "bg-red-100" : ""}`}
            />
          </CardHeader>
          
          <CardContent className="p-6">
            <div className="space-y-6">
              <h3 className="text-lg font-medium">{currentQuestion?.question}</h3>
              
              <RadioGroup
                value={selectedOption !== null ? String(selectedOption) : undefined}
                onValueChange={(value) => setSelectedOption(parseInt(value))}
                className="space-y-3"
              >
                {currentQuestion?.options.map((option: string, index: number) => (
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
    </div>
  )
} 