import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { ABTestStatus } from "@prisma/client"

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Check authentication
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const id = params.id
    const { status } = await request.json()

    // Validate status
    if (!Object.values(ABTestStatus).includes(status as ABTestStatus)) {
      return NextResponse.json({ error: "Invalid status value" }, { status: 400 })
    }

    // Check if test exists
    const existingTest = await prisma.aBTest.findUnique({
      where: { id },
    })

    if (!existingTest) {
      return NextResponse.json({ error: "AB test not found" }, { status: 404 })
    }

    // Update test status
    const updatedTest = await prisma.aBTest.update({
      where: { id },
      data: {
        status: status as ABTestStatus,
        // If status is COMPLETED and no end date is set, set it to now
        ...(status === "COMPLETED" && !existingTest.endDate ? { endDate: new Date() } : {}),
        // If status is ACTIVE and test was in DRAFT, set startDate to now
        ...(status === "ACTIVE" && existingTest.status === "DRAFT" ? { startDate: new Date() } : {}),
      },
    })

    return NextResponse.json({ success: true, test: updatedTest })
  } catch (error) {
    console.error("Error updating AB test status:", error)
    return NextResponse.json({ error: "Failed to update test status" }, { status: 500 })
  }
}

