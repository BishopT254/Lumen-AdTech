import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const reportId = params.id

    // Get user from database to check role
    const user = await prisma.user.findUnique({
      where: { email: session.user.email as string },
      select: { id: true, role: true },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // In a real implementation, you would:
    // 1. Check if the report exists and is ready for download
    // 2. Generate the report file if it doesn't exist
    // 3. Stream the file as a response

    // For this example, we'll return a mock PDF file
    const mockPdfContent = `
      %PDF-1.7
      1 0 obj
      << /Type /Catalog /Pages 2 0 R >>
      endobj
      2 0 obj
      << /Type /Pages /Kids [3 0 R] /Count 1 >>
      endobj
      3 0 obj
      << /Type /Page /Parent 2 0 R /Resources 4 0 R /MediaBox [0 0 612 792] /Contents 5 0 R >>
      endobj
      4 0 obj
      << /Font << /F1 6 0 R >> >>
      endobj
      5 0 obj
      << /Length 44 >>
      stream
      BT /F1 24 Tf 100 700 Td (Lumen Analytics Report) Tj ET
      endstream
      endobj
      6 0 obj
      << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
      endobj
      xref
      0 7
      0000000000 65535 f
      0000000009 00000 n
      0000000058 00000 n
      0000000115 00000 n
      0000000216 00000 n
      0000000259 00000 n
      0000000352 00000 n
      trailer
      << /Size 7 /Root 1 0 R >>
      startxref
      420
      %%EOF
    `

    // Create a response with the PDF content
    const response = new NextResponse(mockPdfContent, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="report-${reportId}.pdf"`,
      },
    })

    return response
  } catch (error) {
    console.error("Error downloading report:", error)
    return NextResponse.json({ error: "Failed to download report" }, { status: 500 })
  }
}
