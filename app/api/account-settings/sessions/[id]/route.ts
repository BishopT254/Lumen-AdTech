import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { deleteCache } from "@/lib/redis"

/**
 * DELETE: Revoke a session
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
    const sessionId = params.id

    // Check if the session exists and belongs to the user
    const sessionToRevoke = await prisma.session.findUnique({
      where: { id: sessionId },
      select: { userId: true },
    })

    if (!sessionToRevoke) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    if (sessionToRevoke.userId !== userId) {
      return NextResponse.json({ error: "You do not have permission to revoke this session" }, { status: 403 })
    }

    // Delete the session
    await prisma.session.delete({
      where: { id: sessionId },
    })

    // Invalidate cache
    await deleteCache(`account-settings:${userId}`)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error revoking session:", error)
    return NextResponse.json({ error: "Failed to revoke session" }, { status: 500 })
  }
}
