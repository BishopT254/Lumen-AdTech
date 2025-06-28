import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { deleteCache } from "@/lib/redis"
import { revalidatePath } from "next/cache"
import { z } from "zod"

// Validation schema for company updates
const companySchema = z.object({
  companyName: z.string().min(2, { message: "Company name must be at least 2 characters." }),
  contactPerson: z.string().min(2, { message: "Contact person must be at least 2 characters." }),
  phoneNumber: z.string().min(5, { message: "Phone number must be at least 5 characters." }),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
})

/**
 * PUT: Update company information
 */
export async function PUT(req: NextRequest) {
  try {
    // Get the authenticated session
    const session = await getServerSession(authOptions)

    // Check if user is authenticated
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Unauthorized. Please sign in to access this resource." }, { status: 401 })
    }

    const userId = session.user.id
    const userRole = session.user.role

    // Check if user is an advertiser or partner
    if (userRole !== "ADVERTISER" && userRole !== "PARTNER") {
      return NextResponse.json(
        { error: "Only advertisers and partners can update company information" },
        { status: 403 },
      )
    }

    // Parse and validate the request body
    const body = await req.json()
    const validationResult = companySchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json({ error: "Invalid data", issues: validationResult.error.issues }, { status: 400 })
    }

    const { companyName, contactPerson, phoneNumber, address, city, country } = validationResult.data

    // Update the appropriate entity based on user role
    if (userRole === "ADVERTISER") {
      // Get the advertiser record
      const advertiser = await prisma.advertiser.findUnique({
        where: { userId },
      })

      if (!advertiser) {
        return NextResponse.json({ error: "Advertiser record not found" }, { status: 404 })
      }

      // Update the advertiser record
      const updatedAdvertiser = await prisma.advertiser.update({
        where: { userId },
        data: {
          companyName,
          contactPerson,
          phoneNumber,
          address,
          city,
          country,
        },
      })

      // Invalidate cache
      await deleteCache(`account-settings:${userId}`)
      await deleteCache(`profile:${userId}`)

      // Revalidate paths
      revalidatePath("/account-settings")
      revalidatePath("/profile")

      return NextResponse.json({ advertiser: updatedAdvertiser })
    } else if (userRole === "PARTNER") {
      // Get the partner record
      const partner = await prisma.partner.findUnique({
        where: { userId },
      })

      if (!partner) {
        return NextResponse.json({ error: "Partner record not found" }, { status: 404 })
      }

      // Update the partner record
      const updatedPartner = await prisma.partner.update({
        where: { userId },
        data: {
          companyName,
          contactPerson,
          phoneNumber,
          address,
          city,
          country,
        },
      })

      // Invalidate cache
      await deleteCache(`account-settings:${userId}`)
      await deleteCache(`profile:${userId}`)

      // Revalidate paths
      revalidatePath("/account-settings")
      revalidatePath("/profile")

      return NextResponse.json({ partner: updatedPartner })
    }

    return NextResponse.json({ error: "Invalid user role" }, { status: 400 })
  } catch (error) {
    console.error("Error updating company information:", error)
    return NextResponse.json({ error: "Failed to update company information" }, { status: 500 })
  }
}
