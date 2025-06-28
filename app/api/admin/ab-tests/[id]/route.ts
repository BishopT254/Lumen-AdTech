import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Check authentication
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const id = params.id

    // Check if test exists
    const existingTest = await prisma.aBTest.findUnique({
      where: { id },
      include: {
        variants: true,
      },
    })

    if (!existingTest) {
      return NextResponse.json({ error: "AB test not found" }, { status: 404 })
    }

    // Delete the AB test (this will cascade delete variants due to the Prisma schema)
    await prisma.aBTest.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting AB test:", error)
    return NextResponse.json({ error: "Failed to delete test" }, { status: 500 })
  }
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Check authentication
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const id = params.id

    // Fetch AB test with related data
    const abTest = await prisma.aBTest.findUnique({
      where: { id },
      include: {
        campaign: {
          include: {
            advertiser: {
              select: {
                companyName: true,
              },
            },
          },
        },
        variants: {
          include: {
            adCreative: {
              select: {
                name: true,
                type: true,
                previewImage: true,
              },
            },
          },
        },
      },
    })

    if (!abTest) {
      return NextResponse.json({ error: "AB test not found" }, { status: 404 })
    }

    return NextResponse.json({ abTest })
  } catch (error) {
    console.error("Error fetching AB test:", error)
    return NextResponse.json({ error: "Failed to fetch AB test" }, { status: 500 })
  }
}

