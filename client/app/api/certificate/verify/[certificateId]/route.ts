import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"

export async function GET(
  request: Request,
  { params }: { params: { certificateId: string } }
) {
  try {
    const certificateId = params.certificateId
    
    if (!certificateId) {
      return NextResponse.json(
        { error: "Certificate ID is required" },
        { status: 400 }
      )
    }

    const { db } = await connectToDatabase()
    
    // Find the certificate by ID
    const certificate = await db.collection("certificates").findOne({ 
      certificateId: certificateId,
      verified: true
    })
    
    if (!certificate) {
      return NextResponse.json(
        { valid: false, message: "Certificate not found or invalid" },
        { status: 404 }
      )
    }
    
    // Get course information
    const course = await db.collection("coursedetails").findOne({ 
      id: certificate.courseId
    })
    
    // Return verification data
    return NextResponse.json({
      valid: true,
      certificate: {
        id: certificate.certificateId,
        userName: certificate.userName,
        courseName: certificate.courseName,
        instructorName: certificate.instructorName,
        issuedDate: certificate.issuedDate,
        courseId: certificate.courseId,
        courseDescription: course?.description || ""
      }
    })
  } catch (error) {
    console.error("Error verifying certificate:", error)
    return NextResponse.json(
      { error: "Failed to verify certificate" },
      { status: 500 }
    )
  }
} 