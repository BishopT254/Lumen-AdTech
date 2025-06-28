import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { deleteCache } from "@/lib/redis"
import { revalidatePath } from "next/cache"
import { writeFile } from "fs/promises"
import { join } from "path"
import { v4 as uuidv4 } from "uuid"

/**
 * POST: Upload a profile image
 */
export async function POST(req: NextRequest) {
  try {
    // Get the authenticated session
    const session = await getServerSession(authOptions)

    // Check if user is authenticated
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Unauthorized. Please sign in to access this resource." }, { status: 401 })
    }

    const userId = session.user.id

    // Parse the form data
    const formData = await req.formData()
    const image = formData.get("image") as File

    if (!image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 })
    }

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if (!validTypes.includes(image.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed." },
        { status: 400 },
      )
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (image.size > maxSize) {
      return NextResponse.json({ error: "Image size exceeds 5MB limit." }, { status: 400 })
    }

    // Create a unique filename
    const fileExt = image.name.split(".").pop()
    const fileName = `${uuidv4()}.${fileExt}`
    const filePath = `/uploads/profile/${fileName}`
    const publicPath = `public${filePath}`

    // Ensure directory exists
    const directory = join(process.cwd(), "public/uploads/profile")
    try {
      await writeFile(join(process.cwd(), publicPath), Buffer.from(await image.arrayBuffer()))
    } catch (error) {
      console.error("Error saving file:", error)
      return NextResponse.json({ error: "Failed to save image" }, { status: 500 })
    }

    // Update the user's profile image
    await prisma.user.update({
      where: { id: userId },
      data: { image: filePath },
    })

    // Invalidate cache
    await deleteCache(`account-settings:${userId}`)
    await deleteCache(`profile:${userId}`)

    // Revalidate paths
    revalidatePath("/account-settings")
    revalidatePath("/profile")

    return NextResponse.json({ success: true, imageUrl: filePath })
  } catch (error) {
    console.error("Error uploading image:", error)
    return NextResponse.json({ error: "Failed to upload image" }, { status: 500 })
  }
}
