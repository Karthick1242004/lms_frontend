import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import puppeteer from "puppeteer"
import { connectToDatabase } from "@/lib/mongodb"

// This is a test API endpoint for debugging certificate generation
export async function GET(request: Request) {
  try {
    console.log("Certificate test API called")
    
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }
    
    const userEmail = session.user.email
    
    // Get courseId from query params if available
    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get("courseId")
    
    // If courseId is provided, verify eligibility
    if (courseId) {
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
      
      console.log("Test certificate: Assessment result found:", !!assessmentResult)
      console.log("Test certificate: Certificate earned in userProgress:", !!userProgress)
      
      // Either assessment result or userProgress certificate flag must be true
      if (!assessmentResult && !userProgress) {
        console.error("Test certificate: User hasn't passed assessment or earned certificate")
        return NextResponse.json(
          { error: "You have not passed the assessment for this course" },
          { status: 403 }
        )
      }
    }

    // Generate a simple test certificate HTML
    const certificateHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Test Certificate</title>
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
        .description {
          font-size: 18px;
          margin: 15px 0;
        }
      </style>
    </head>
    <body>
      <div class="certificate">
        <div class="certificate-content">
          <div class="title">TEST CERTIFICATE</div>
          <div class="description">This is a test certificate for debugging purposes.</div>
          <div class="description">User Email: ${session.user.email}</div>
          <div class="description">Current Time: ${new Date().toISOString()}</div>
          ${courseId ? `<div class="description">Course ID: ${courseId}</div>` : ''}
        </div>
      </div>
    </body>
    </html>
    `
    
    console.log("Launching puppeteer")
    
    try {
      // Generate PDF with Puppeteer
      const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      })
      
      console.log("Puppeteer launched, creating page")
      
      const page = await browser.newPage()
      await page.setContent(certificateHtml)
      
      console.log("Page content set, generating PDF")
      
      // Set PDF options to match US Letter landscape
      const pdfBuffer = await page.pdf({
        format: 'Letter', 
        landscape: true,
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' }
      })
      
      console.log("PDF generated, closing browser")
      
      await browser.close()
      
      console.log("Browser closed, returning PDF")
      
      // Return the PDF as a binary stream
      return new NextResponse(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="test_certificate.pdf"`
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
    console.error("Error generating test certificate:", error)
    return NextResponse.json(
      { error: "Failed to generate test certificate", details: error.message },
      { status: 500 }
    )
  }
} 