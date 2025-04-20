"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"
import { formatDate } from "@/lib/utils"

export default function VerifyCertificatePage() {
  const { certificateId } = useParams()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [certificate, setCertificate] = useState<any>(null)
  const [isValid, setIsValid] = useState(false)

  useEffect(() => {
    async function verifyCertificate() {
      try {
        setIsLoading(true)
        setError(null)
        
        const response = await fetch(`/api/certificate/verify/${certificateId}`)
        const data = await response.json()
        
        if (!response.ok) {
          throw new Error(data.error || "Certificate verification failed")
        }
        
        setIsValid(data.valid)
        setCertificate(data.certificate)
      } catch (error) {
        console.error("Verification error:", error)
        setError("Failed to verify certificate. It may be invalid or not exist.")
        setIsValid(false)
      } finally {
        setIsLoading(false)
      }
    }
    
    if (certificateId) {
      verifyCertificate()
    } else {
      setError("No certificate ID provided")
      setIsLoading(false)
    }
  }, [certificateId])

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Verifying Certificate...</CardTitle>
            <CardDescription>Please wait while we verify the certificate authenticity.</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center p-6">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || !isValid) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        <Card className="w-full max-w-md border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-6 w-6" />
              Invalid Certificate
            </CardTitle>
            <CardDescription>This certificate could not be verified.</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertTitle>Verification Failed</AlertTitle>
              <AlertDescription>
                {error || "This certificate is not valid or does not exist in our records."}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6">
      <Card className="w-full max-w-md border-green-500">
        <CardHeader className="border-b pb-6">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-6 w-6 text-green-500" />
            <CardTitle className="text-green-700">Valid Certificate</CardTitle>
          </div>
          <CardDescription>This certificate has been verified as authentic.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Certificate ID</h3>
              <p className="text-sm font-mono">{certificate.id}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Issued To</h3>
              <p className="text-base font-medium">{certificate.userName}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Course</h3>
              <p className="text-base font-medium">{certificate.courseName}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Instructor</h3>
              <p className="text-base">{certificate.instructorName}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Issue Date</h3>
              <p className="text-base">{formatDate(certificate.issuedDate)}</p>
            </div>
            
            {certificate.courseDescription && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Course Description</h3>
                <p className="text-sm text-muted-foreground">{certificate.courseDescription}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 