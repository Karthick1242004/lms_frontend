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
    
    if (!session?.user?.email) {
      console.error("Certificate generation: Unauthorized - no user session")
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const userEmail = session.user.email
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
      userEmail,
      courseId,
      passed: true
    })
    
    // Check if user has earned certificate in userProgress
    const userProgress = await db.collection("userProgress").findOne({
      userEmail,
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
      userEmail,
      courseId
    })
    
    if (!certificate) {
      // Create a new certificate
      const certificateId = generateCertificateId(userEmail, courseId)
      
      const newCertificate = {
        userEmail,
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
    
    // Generate certificate HTML
    const certificateHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Certificate of Completion</title>
      <style>
        body, html {
          margin: 0;
          padding: 0;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          box-sizing: border-box;
          width: 100%;
          height: 100%;
        }
        
        .certificate-container {
          width: 1050px;
          height: 750px;
          padding: 20px;
          text-align: center;
          position: relative;
          margin: 0 auto;
          background-color: var(--certificate-background);
        }
        
        .certificate-border {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          border: 20px solid var(--certificate-primary);
          border-radius: 5px;
          pointer-events: none;
          z-index: -1;
        }
        
        .border-pattern {
          position: absolute;
          top: 20px;
          left: 20px;
          right: 20px;
          bottom: 20px;
          border: 1px solid var(--certificate-secondary);
          border-radius: 3px;
          pointer-events: none;
          z-index: -1;
        }
        
        .certificate-content {
          padding: 60px 80px;
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          box-sizing: border-box;
        }
        
        .certificate-title {
          color: var(--certificate-dark-text);
          font-size: 48px;
          font-weight: 700;
          margin-bottom: 10px;
        }
        
        .certificate-subtitle {
          color: var(--certificate-primary);
          font-size: 24px;
          margin-bottom: 30px;
        }
        
        .recipient-name {
          color: var(--certificate-dark-text);
          font-size: 34px;
          font-weight: 700;
          margin: 20px 0 10px;
        }
        
        .recipient-underline {
          width: 300px;
          height: 1px;
          background-color: var(--certificate-primary);
          margin: 0 auto 10px;
        }
        
        .description {
          color: var(--certificate-dark-text);
          font-size: 18px;
          font-weight: 400;
          margin: 15px 0;
        }
        
        .course-name {
          color: var(--certificate-primary);
          font-size: 24px;
          font-weight: 700;
          margin: 10px 0 30px;
          padding: 0 40px;
        }
        
        .date-id {
          font-size: 14px;
          color: var(--certificate-muted);
          margin: 20px 0;
        }
        
        .signatures {
          display: flex;
          justify-content: space-between;
          width: 80%;
          margin: 30px auto 0;
        }
        
        .signature {
          width: 45%;
          text-align: center;
        }
        
        .signature-line {
          width: 100%;
          height: 1px;
          background-color: var(--certificate-dark-text);
          margin-bottom: 10px;
        }
        
        .footer {
          font-size: 12px;
          color: var(--certificate-light-muted);
          margin-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="certificate-container">
        <div class="certificate-border"></div>
        <div class="border-pattern"></div>
        <div class="certificate-content">
          <div class="certificate-title">Certificate of Completion</div>
          <div class="certificate-subtitle">This is to certify that</div>
          
          <div class="recipient-name">${userName}</div>
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
    
    // Generate PDF using Puppeteer
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: "new"
    })
    const page = await browser.newPage()
    
    await page.setContent(certificateHtml)
    
    // Wait for any resources to load
    await page.waitForNetworkIdle({ timeout: 3000 }).catch(() => {
      console.log("Network idle timeout reached, continuing...")
    })
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      landscape: true,
      printBackground: true,
      margin: {
        top: '0',
        right: '0',
        bottom: '0',
        left: '0'
      }
    })
    
    await browser.close()
    
    // Convert to base64 for return
    const base64Cert = pdfBuffer.toString('base64')
    
    return NextResponse.json({
      certificateId: certificate.certificateId,
      certificate: base64Cert,
      message: "Certificate generated successfully"
    })
  } catch (error) {
    console.error("Error generating certificate:", error)
    return NextResponse.json(
      { error: "Failed to generate certificate" },
      { status: 500 }
    )
  }
} 