"use client"

import React from 'react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

interface CertificateTemplateProps {
  userName: string
  courseName: string
  instructorName: string
  completionDate?: Date
  certificateId: string
  className?: string
}

const CertificateTemplate = React.forwardRef<
  HTMLDivElement,
  CertificateTemplateProps
>(
  (
    {
      userName,
      courseName,
      instructorName,
      completionDate,
      certificateId,
      className,
    },
    ref
  ) => {
    return (
      <div 
        ref={ref}
        className={cn(
          "relative w-[1056px] h-[816px] bg-white p-10 font-serif", 
          className
        )}
        style={{
          // backgroundImage: 'url(/images/certificate-bg.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Certificate Border */}
        <div className="absolute inset-5 border-8 border-amber-100 rounded-lg"></div>
        
        {/* Certificate Content */}
        <div className="flex flex-col items-center justify-between h-full py-12 px-16 relative z-10">
          <div className="text-center">
            <h1 className="text-5xl font-bold text-amber-800 mb-3">Certificate of Completion</h1>
            <div className="w-96 h-1 bg-amber-800 mx-auto mb-8"></div>
            <p className="text-xl text-gray-600 italic mb-6">This is to certify that</p>
            <h2 className="text-4xl font-bold text-amber-900 mb-4 font-script">{userName}</h2>
            <p className="text-xl text-gray-600 italic mb-6">has successfully completed the course</p>
            <h3 className="text-3xl font-bold text-amber-900 mb-10 px-10">{courseName}</h3>
          </div>
          
          <div className="w-full flex justify-between items-end mt-8">
            <div className="text-center">
              <div className="w-64 h-px bg-gray-400 mb-2"></div>
              <p className="text-lg text-gray-700">{instructorName}</p>
              <p className="text-sm text-gray-600">Instructor</p>
            </div>
            
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 mb-4">
                {/* <img 
                  src="/images/badge.png" 
                  alt="Certificate Badge" 
                  className="w-full h-full object-contain"
                /> */}
              </div>
            </div>
            
            <div className="text-center">
              <div className="w-64 h-px bg-gray-400 mb-2"></div>
              <p className="text-lg text-gray-700">
                {completionDate ? new Date(completionDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Date of Completion'}
              </p>
              <p className="text-xs text-gray-500 mt-2">Certificate ID: {certificateId}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }
)

CertificateTemplate.displayName = 'CertificateTemplate'

export default CertificateTemplate 