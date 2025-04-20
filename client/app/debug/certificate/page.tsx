"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import CertificateModal from "@/components/certificate/certificate-modal"
import { generateCertificateId } from "@/lib/utils"

export default function CertificateDebugPage() {
  const [showCertificate, setShowCertificate] = useState(false)
  const [testApiResponse, setTestApiResponse] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  
  const handleTestCertificateApi = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/certificate/test')
      
      if (!response.ok) {
        const errorData = await response.json()
        setTestApiResponse(`Error: ${errorData.error || response.statusText}`)
        return
      }
      
      // If successful, create a download link for the PDF
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = "test_certificate.pdf"
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      setTestApiResponse("Test certificate downloaded successfully!")
    } catch (error) {
      console.error("Test API error:", error)
      setTestApiResponse(`Error: ${(error as Error).message || 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }
  
  const testCertificateData = {
    userName: "Test User",
    courseName: "Debug Course",
    instructorName: "Test Instructor",
    completionDate: new Date(),
    certificateId: generateCertificateId("test-user", "test-course"),
    courseId: "test-course"
  }
  
  return (
    <div className="container mx-auto py-10 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Certificate Debug Page</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Button 
              onClick={() => setShowCertificate(true)}
              className="w-full"
            >
              Show Certificate Modal
            </Button>
            
            <Button 
              onClick={handleTestCertificateApi}
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? "Loading..." : "Test Certificate Generation API"}
            </Button>
          </div>
          
          {testApiResponse && (
            <div className="p-4 border rounded-md bg-slate-50 dark:bg-slate-900">
              <h3 className="font-medium mb-2">API Response:</h3>
              <p>{testApiResponse}</p>
            </div>
          )}
          
          <div className="p-4 border rounded-md bg-slate-50 dark:bg-slate-900">
            <h3 className="font-medium mb-2">Debug Information:</h3>
            <p>This page allows you to test the certificate functionality directly without going through the assessment flow.</p>
            <p>Use these buttons to check if the certificate generation works correctly.</p>
          </div>
        </CardContent>
      </Card>
      
      {showCertificate && (
        <CertificateModal
          isOpen={showCertificate}
          onClose={() => setShowCertificate(false)}
          {...testCertificateData}
        />
      )}
    </div>
  )
} 