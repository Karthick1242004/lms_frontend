"use client"

import React, { useRef, useState } from 'react'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Loader2, AlertCircle } from 'lucide-react'
import CertificateTemplate from './certificate-template'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface CertificateModalProps {
  isOpen: boolean
  onClose: () => void
  userName: string
  courseName: string
  instructorName: string
  completionDate: Date
  certificateId: string
  courseId: string
}

export default function CertificateModal({
  isOpen,
  onClose,
  userName,
  courseName,
  instructorName,
  completionDate,
  certificateId,
  courseId
}: CertificateModalProps) {
  const { toast } = useToast()
  const certificateRef = useRef<HTMLDivElement>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [showDebugDownload, setShowDebugDownload] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleDownload = async () => {
    if (!certificateRef.current) return
    
    try {
      setIsGenerating(true)
      setErrorMessage(null)
      console.log("Initiating certificate download with data:", {
        userName,
        courseName,
        instructorName,
        courseId
      });
      
      // Generate PDF on the server
      const response = await fetch('/api/certificate/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userName,
          courseName,
          instructorName,
          completionDate,
          certificateId,
          courseId
        }),
      })
      
      console.log("Certificate API response status:", response.status);
      
      if (!response.ok) {
        // Try to get error details
        let errorDetails = "";
        try {
          const errorData = await response.json();
          errorDetails = errorData.error || "";
          console.error("Certificate generation error:", errorData);
          
          // Set the error message for display
          setErrorMessage(errorDetails);
          
          // If this is a 403 error (not eligible), don't show debug button
          if (response.status === 403) {
            setShowDebugDownload(false);
            throw new Error(errorDetails);
          }
        } catch (e) {
          // If can't parse JSON, use status text
          errorDetails = response.statusText;
        }
        
        throw new Error(`Failed to generate certificate: ${errorDetails}`);
      }
      
      // Get PDF blob
      const blob = await response.blob()
      console.log("PDF blob received, size:", blob.size);
      
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = `${courseName.replace(/\s+/g, '_')}_${userName.replace(/\s+/g, '_')}_Certificate.pdf`
      
      // Add to document, trigger click, and clean up
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast({
        title: 'Certificate downloaded!',
        description: 'Your certificate has been successfully downloaded.',
      })
    } catch (error) {
      console.error('Download error:', error)
      toast({
        title: 'Download failed',
        description: `There was an error downloading your certificate: ${error.message}. Please try again.`,
        variant: 'destructive',
      })
      
      // Show debug button for direct download from test API only for technical errors
      if (!errorMessage?.includes("have not passed the assessment")) {
        setShowDebugDownload(true);
      }
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Course Completion Certificate</DialogTitle>
        </DialogHeader>
        
        {errorMessage && (
          <Alert variant="destructive" className="my-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {errorMessage}
            </AlertDescription>
          </Alert>
        )}
        
        <div className="flex justify-center mt-4 mb-6">
          <div className="scale-[0.6] origin-top transform border shadow-lg">
            <CertificateTemplate
              ref={certificateRef}
              userName={userName}
              courseName={courseName}
              instructorName={instructorName}
              completionDate={completionDate}
              certificateId={certificateId}
            />
          </div>
        </div>
        
        <div className="flex justify-center gap-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button 
            onClick={handleDownload} 
            disabled={isGenerating || !!errorMessage}
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating PDF...
              </>
            ) : (
              'Download Certificate'
            )}
          </Button>
          
          {/* Debug button that appears if main download fails */}
          {showDebugDownload && (
            <Button 
              variant="outline" 
              className="border-red-500 text-red-500"
              onClick={async () => {
                try {
                  console.log("Trying alternative download method");
                  const response = await fetch(`/api/certificate/test?courseId=${courseId}`);
                  if (!response.ok) throw new Error('Test API failed');
                  
                  const blob = await response.blob();
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.style.display = 'none';
                  a.href = url;
                  a.download = "debug_certificate.pdf";
                  document.body.appendChild(a);
                  a.click();
                  window.URL.revokeObjectURL(url);
                  document.body.removeChild(a);
                  
                  toast({
                    title: 'Debug certificate downloaded',
                    description: 'Used alternative API endpoint.',
                  });
                } catch (e) {
                  console.error("Debug download failed:", e);
                  toast({
                    title: 'Even debug download failed',
                    description: e.message,
                    variant: 'destructive',
                  });
                }
              }}
            >
              Try Debug Download
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
} 