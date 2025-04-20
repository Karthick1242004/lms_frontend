import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import puppeteer from "puppeteer"
import { generateCertificateId } from "@/lib/utils"

export async function POST(request: Request) {
  try {
    console.log("Certificate generation request received")
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      console.error("Certificate generation: Unauthorized - no user session")
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const userId = session.user.id
    const body = await request.json()
    const { userName, courseName, instructorName, courseId, completionDate } = body
    
    console.log("Certificate request body:", body)
    
    if (!userName || !courseName || !courseId) {
      console.error("Certificate generation: Missing required fields", { userName, courseName, courseId })
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    const { db } = await connectToDatabase()
    
    // Check if the user has passed the assessment
    const assessmentResult = await db.collection("assessmentResults").findOne({
      userId,
      courseId,
      passed: true
    })
    
    // Check if user has earned certificate in userProgress
    const userProgress = await db.collection("userProgress").findOne({
      userId,
      [`courses.${courseId}.certificateEarned`]: true
    })
    
    console.log("Assessment result found:", !!assessmentResult)
    console.log("Certificate earned in userProgress:", !!userProgress)
    
    // Either assessment result or userProgress certificate flag must be true
    if (!assessmentResult && !userProgress) {
      console.error("Certificate generation: User hasn't passed assessment or earned certificate")
      return NextResponse.json(
        { error: "You have not passed the assessment for this course" },
        { status: 403 }
      )
    }
    
    // Get or create certificate record
    let certificate = await db.collection("certificates").findOne({
      userId,
      courseId
    })
    
    if (!certificate) {
      // Create a new certificate
      const certificateId = generateCertificateId(userId, courseId)
      
      const newCertificate = {
        userId,
        courseId,
        certificateId,
        userName,
        courseName, 
        instructorName: instructorName || "Course Instructor",
        issuedDate: new Date(),
        verified: true
      }
      
      await db.collection("certificates").insertOne(newCertificate)
      certificate = newCertificate
      console.log("Created new certificate:", certificateId)
    } else {
      console.log("Using existing certificate:", certificate.certificateId)
    }
    
    // Generate HTML for certificate
    const certificateHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Course Completion Certificate</title>
      <style>
        body {
          font-family: 'Georgia', serif;
          margin: 0;
          padding: 0;
          width: 11in;
          height: 8.5in;
          background-color: white;
          color: #1e293b;
        }
        .certificate {
          width: 100%;
          height: 100%;
          border: 20px solid #0c4a6e;
          box-sizing: border-box;
          padding: 40px;
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .certificate-bg {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          opacity: 0.05;
          z-index: 0;
        }
        .certificate-content {
          position: relative;
          z-index: 2;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          height: 100%;
          width: 100%;
        }
        .title {
          font-size: 36px;
          font-weight: bold;
          color: #0c4a6e;
          margin-bottom: 20px;
          letter-spacing: 1px;
        }
        .title-underline {
          width: 250px;
          height: 3px;
          background-color: #0c4a6e;
          margin-bottom: 40px;
        }
        .recipient {
          font-size: 28px;
          font-weight: bold;
          font-style: italic;
          color: #0c4a6e;
          margin: 20px 0;
        }
        .recipient-underline {
          width: 200px;
          height: 1px;
          background-color: #94a3b8;
          margin-bottom: 20px;
        }
        .course-name {
          font-size: 32px;
          font-weight: bold;
          color: #0c4a6e;
          margin: 30px 0;
        }
        .description {
          font-size: 18px;
          margin: 15px 0;
        }
        .date-id {
          font-size: 16px;
          margin: 20px 0;
        }
        .signatures {
          display: flex;
          justify-content: space-between;
          width: 100%;
          margin-top: auto;
          padding-bottom: 20px;
        }
        .signature {
          text-align: center;
        }
        .signature-line {
          width: 200px;
          height: 1px;
          background-color: #94a3b8;
          margin-bottom: 10px;
        }
        .footer {
          position: absolute;
          bottom: 10px;
          right: 10px;
          font-size: 10px;
          color: #94a3b8;
        }
      </style>
    </head>
    <body>
      <div class="certificate">
        <div class="certificate-content">
          <div class="title">CERTIFICATE OF COMPLETION</div>
          <div class="title-underline"></div>
          
          <div class="description">This certifies that</div>
          
          <div class="recipient">${userName}</div>
          <div class="recipient-underline"></div>
          
          <div class="description">has successfully completed the course</div>
          
          <div class="course-name">${courseName}</div>
          
          <div class="date-id">
            <p>Awarded on ${new Date(certificate.issuedDate).toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</p>
            <p>Certificate ID: ${certificate.certificateId}</p>
          </div>
          
          <div class="signatures">
            <div class="signature">
              <div class="signature-line"></div>
              <p style="font-weight: bold; font-size: 16px;">Platform Signature</p>
            </div>
            
            <div class="signature">
              <div class="signature-line"></div>
              <p style="font-weight: bold; font-size: 16px;">${certificate.instructorName}</p>
              <p style="font-size: 12px;">Instructor</p>
            </div>
          </div>
          
          <div class="footer">
            Verified at ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/verify/${certificate.certificateId}
          </div>
        </div>
      </div>
    </body>
    </html>
    `
    
    // Generate PDF with Puppeteer
    try {
      const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      })
      
      const page = await browser.newPage()
      await page.setContent(certificateHtml)
      
      // Set PDF options to match US Letter landscape
      const pdfBuffer = await page.pdf({
        format: 'Letter', 
        landscape: true,
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' }
      })
      
      await browser.close()
      
      // Return the PDF as a binary stream
      return new NextResponse(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${courseName.replace(/\s+/g, '_')}_${userName.replace(/\s+/g, '_')}_Certificate.pdf"`
        }
      })
    } catch (puppeteerError) {
      console.error("Puppeteer error:", puppeteerError)
      return NextResponse.json(
        { error: "Error generating PDF", details: puppeteerError.message },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("Error generating certificate:", error)
    return NextResponse.json(
      { error: "Failed to generate certificate" },
      { status: 500 }
    )
  }
} 