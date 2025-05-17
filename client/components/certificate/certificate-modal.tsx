"use client"

import React, { useRef, useState } from 'react'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Loader2, AlertCircle, Download, FileDown } from 'lucide-react'
import CertificateTemplate from './certificate-template'
import { Alert, AlertDescription } from '@/components/ui/alert'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

interface CertificateModalProps {
  isOpen: boolean
  onClose: () => void
  userName: string
  courseName: string
  instructorName: string
  completionDate: Date
  certificateId: string
  courseId: string
  score?: number
}

export default function CertificateModal({
  isOpen,
  onClose,
  userName,
  courseName,
  instructorName,
  completionDate,
  certificateId,
  courseId,
  score
}: CertificateModalProps) {
  const { toast } = useToast()
  const certificateRef = useRef<HTMLDivElement>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isGeneratingClientPDF, setIsGeneratingClientPDF] = useState(false)
  const [showDebugDownload, setShowDebugDownload] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Function to generate PDF on the client side
  const handleClientSidePDF = async () => {
    if (!certificateRef.current) return
    
    try {
      setIsGeneratingClientPDF(true)
      
      // First temporarily change the container's scale to ensure good quality
      const certificateContainer = document.getElementById('certificate-container')
      if (certificateContainer) {
        // Save original styles
        const originalScale = certificateContainer.style.transform
        const originalWidth = certificateContainer.style.width
        const originalHeight = certificateContainer.style.height
        
        // Remove scaling for capture
        certificateContainer.style.transform = 'none'
        certificateContainer.style.width = '11in'
        certificateContainer.style.height = '8.5in'
        
        // Capture the certificate as a canvas
        const canvas = await html2canvas(certificateRef.current, {
          scale: 2, // Higher scale for better quality
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff'
        })
        
        // Restore original styles
        certificateContainer.style.transform = originalScale
        certificateContainer.style.width = originalWidth
        certificateContainer.style.height = originalHeight
        
        // Create PDF (landscape letter size)
        const pdf = new jsPDF({
          orientation: 'landscape',
          unit: 'pt',
          format: 'letter' // 11x8.5 inches
        })
        
        // Calculate dimensions to maintain aspect ratio
        const imgData = canvas.toDataURL('image/png')
        const pdfWidth = pdf.internal.pageSize.getWidth()
        const pdfHeight = pdf.internal.pageSize.getHeight()
        const ratio = Math.min(pdfWidth / canvas.width, pdfHeight / canvas.height)
        const imgWidth = canvas.width * ratio
        const imgHeight = canvas.height * ratio
        const x = (pdfWidth - imgWidth) / 2
        const y = (pdfHeight - imgHeight) / 2
        
        // Add image to PDF
        pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight)
        
        // Save the PDF
        pdf.save(`${courseName.replace(/\s+/g, '_')}_${userName.replace(/\s+/g, '_')}_Certificate.pdf`)
        
        toast({
          title: 'Certificate downloaded!',
          description: 'Your certificate has been successfully downloaded as a PDF.',
        })
      } else {
        throw new Error('Certificate container not found')
      }
    } catch (error) {
      console.error('Client-side PDF generation error:', error)
      toast({
        title: 'Download failed',
        description: 'There was an error generating the PDF. Please try the server-side download instead.',
        variant: 'destructive',
      })
    } finally {
      setIsGeneratingClientPDF(false)
    }
  }

  const handleDownload = async () => {
    if (!certificateRef.current) return
    
    try {
      setIsGenerating(true)
      setErrorMessage(null)
      console.log("Initiating certificate download with data:", {
        userName,
        courseName,
        instructorName,
        courseId,
        score
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
          courseId,
          score
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
        description: `There was an error downloading your certificate: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
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
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden">
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
        <div className="flex justify-center gap-4 flex-wrap">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>

          {/* Client-side PDF generation button */}
          <Button 
            onClick={handleClientSidePDF} 
            disabled={isGeneratingClientPDF}
            variant="secondary"
          >
            {isGeneratingClientPDF ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating PDF...
              </>
            ) : (
              <>
                <FileDown className="mr-2 h-4 w-4" />
                Download as PDF
              </>
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
                    description: e instanceof Error ? e.message : 'An unknown error occurred',
                    variant: 'destructive',
                  });
                }
              }}
            >
              Try Debug Download
            </Button>
          )}
        </div>
        <div className="flex justify-center mt-4 mb-6">
          <div id="certificate-container" className="scale-[0.6] origin-top transform border shadow-lg">
            <CertificateTemplate
              ref={certificateRef}
              userName={userName}
              courseName={courseName}
              instructorName={instructorName}
              completionDate={completionDate}
              certificateId={certificateId}
              score={score}
            />
          </div>
        </div>
        
        
      </DialogContent>
    </Dialog>
  )
} 