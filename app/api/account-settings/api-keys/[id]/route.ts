import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { deleteCache } from "@/lib/redis"

/**
 * DELETE: Delete an API key
 */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Get the authenticated session
    const session = await getServerSession(authOptions)

    // Check if user is authenticated
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Unauthorized. Please sign in to access this resource." }, { status: 401 })
    }

    const userId = session.user.id
    const keyId = params.id

    // Check if the API key exists and belongs to the user
    const apiKey = await prisma.apiKey.findUnique({
      where: { id: keyId },
      select: { userId: true },
    })

    if (!apiKey) {
      return NextResponse.json({ error: "API key not found" }, { status: 404 })
    }

    if (apiKey.userId !== userId) {
      return NextResponse.json({ error: "You do not have permission to delete this API key" }, { status: 403 })
    }

    // Delete the API key
    await prisma.apiKey.delete({
      where: { id: keyId },
    })

    // Invalidate cache
    await deleteCache(`account-settings:${userId}`)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting API key:", error)
    return NextResponse.json({ error: "Failed to delete API key" }, { status: 500 })
  }
}
