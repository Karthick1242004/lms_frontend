"use client"

import React from 'react'
import { formatDate } from '@/lib/utils'

interface CertificateTemplateProps {
  userName: string
  courseName: string
  instructorName: string
  completionDate: Date
  certificateId: string
}

const CertificateTemplate = React.forwardRef<HTMLDivElement, CertificateTemplateProps>(
  ({ userName, courseName, instructorName, completionDate, certificateId }, ref) => {
    return (
      <div 
        ref={ref}
        className="relative w-[11in] h-[8.5in] bg-white"
        style={{ 
          fontFamily: 'Georgia, serif',
          border: '20px solid #0c4a6e',
          boxSizing: 'border-box',
          padding: '40px',
          color: '#1e293b'
        }}
      >
        {/* Background Pattern */}
        <div 
          className="absolute inset-0 z-0 opacity-5" 
          style={{ backgroundImage: 'url(/images/certificate-bg.png)' }} 
        />
        
        {/* Certificate Content */}
        <div className="relative z-10 flex flex-col items-center text-center h-full">
          <div className="mb-6">
            <h1 className="text-4xl font-bold tracking-wide text-sky-900 mb-2">CERTIFICATE OF COMPLETION</h1>
            <div className="w-64 h-1 bg-sky-800 mx-auto"></div>
          </div>
          
          <div className="mt-6 mb-2">
            <p className="text-xl">This certifies that</p>
          </div>
          
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-sky-800 italic">{userName}</h2>
            <div className="w-48 h-0.5 bg-slate-400 mx-auto mt-1"></div>
          </div>
          
          <div className="mb-8">
            <p className="text-xl">has successfully completed the course</p>
          </div>
          
          <div className="mb-12">
            <h3 className="text-4xl font-bold text-sky-900">{courseName}</h3>
          </div>
          
          <div className="mb-6 text-lg">
            <p>Awarded on {formatDate(completionDate)}</p>
            <p>Certificate ID: {certificateId}</p>
          </div>
          
          <div className="mt-auto flex w-full justify-between items-end">
            <div className="text-center">
              <div className="w-48 h-0.5 bg-slate-400 mb-2"></div>
              <p className="font-semibold text-lg">Platform Signature</p>
            </div>
            
            <div className="text-center">
              <div className="w-48 h-0.5 bg-slate-400 mb-2"></div>
              <p className="font-semibold text-lg">{instructorName}</p>
              <p className="text-sm">Instructor</p>
            </div>
          </div>
          
          <div className="absolute bottom-2 right-2 text-xs text-slate-500">
            Verified at {window.location.origin}/verify/{certificateId}
          </div>
        </div>
      </div>
    )
  }
)

CertificateTemplate.displayName = 'CertificateTemplate'

export default CertificateTemplate 