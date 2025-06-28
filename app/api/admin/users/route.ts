import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { hash } from "bcryptjs"
import type { UserRole } from "@prisma/client"

// Validation schema for query parameters
const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  role: z.enum(["ADMIN", "ADVERTISER", "PARTNER"]).optional(),
  search: z.string().optional(),
  sort: z.enum(["name", "email", "role", "createdAt"]).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
})

// Validation schema for user creation
const userCreateSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }).optional().or(z.literal("")),
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(8, { message: "Password must be at least 8 characters" }),
  role: z.enum(["ADMIN", "ADVERTISER", "PARTNER"]),
  bio: z.string().optional(),
  sendWelcomeEmail: z.boolean().default(true),

  // Advertiser and Partner fields
  companyName: z.string().min(2).optional(),
  contactPerson: z.string().min(2).optional(),
  phoneNumber: z.string().min(5).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),

  // Partner specific fields
  businessType: z.string().optional(),
  commissionRate: z.number().min(0).max(100).optional(),

  // Admin fields
  permissions: z.record(z.boolean()).or(z.array(z.string())).optional(),
})

// Validation schema for user updates
const userUpdateSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }).optional(),
  email: z.string().email({ message: "Invalid email address" }).optional(),
  password: z.string().min(8, { message: "Password must be at least 8 characters" }).optional(),
  role: z.enum(["ADMIN", "ADVERTISER", "PARTNER"]).optional(),
  bio: z.string().optional(),

  // Advertiser and Partner fields
  companyName: z.string().min(2).optional(),
  contactPerson: z.string().min(2).optional(),
  phoneNumber: z.string().min(5).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),

  // Partner specific fields
  businessType: z.string().optional(),
  commissionRate: z.number().min(0).max(100).optional(),

  // Admin fields
  permissions: z.record(z.boolean()).or(z.array(z.string())).optional(),

  isActive: z.boolean().optional(),
})

// Helper to check admin access
async function checkAdminAccess(session: any) {
  if (!session || session.user.role !== "ADMIN") {
    return false
  }
  return true
}

export async function GET(req: NextRequest) {
  try {
    // Verify admin authorization
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Parse query parameters
    const url = new URL(req.url)
    const search = url.searchParams.get("search") || ""
    
    // Fix: Handle the "undefined" string value properly
    const roleParam = url.searchParams.get("role")
    // Only set role if it's a valid enum value, not the string "undefined"
    const role = roleParam && roleParam !== "undefined" ? roleParam as UserRole : undefined
    
    const statusParam = url.searchParams.get("status")
    const status = statusParam && statusParam !== "undefined" ? statusParam : undefined
    
    const sort = url.searchParams.get("sort") || "createdAt"
    const order = url.searchParams.get("order") || "desc"
    const limit = Number.parseInt(url.searchParams.get("limit") || "50", 10)
    const page = Number.parseInt(url.searchParams.get("page") || "1", 10)
    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {}

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ]
    }

    // Only add role to where clause if it's actually defined
    if (role) {
      where.role = role
    }

    // Fetch users with necessary details
    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          emailVerified: true,
          image: true,
          role: true,
          bio: true,
          createdAt: true,
          updatedAt: true,
          advertiser: {
            select: {
              companyName: true,
              contactPerson: true,
              phoneNumber: true,
              address: true,
              city: true,
              state: true,
              postalCode: true,
              country: true,
            },
          },
          partner: {
            select: {
              companyName: true,
              contactPerson: true,
              phoneNumber: true,
              address: true,
              city: true,
              state: true,
              postalCode: true,
              country: true,
              businessType: true,
              status: true,
            },
          },
          admin: {
            select: {
              permissions: true,
            },
          },
          sessions: {
            orderBy: {
              expires: "desc",
            },
            take: 1,
            select: {
              expires: true,
            },
          },
          loginHistory: {
            orderBy: {
              timestamp: "desc",
            },
            take: 1,
          },
        },
        orderBy: {
          [sort]: order,
        },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ])

    // Process users to include additional information
    const processedUsers = users.map((user) => {
      // Determine status based on various factors
      let userStatus: "active" | "inactive" | "pending" | "suspended" = "inactive"

      // If partner has explicit status, use that
      if (user.role === "PARTNER" && user.partner?.status) {
        if (user.partner.status === "SUSPENDED") {
          userStatus = "suspended"
        } else if (user.partner.status === "PENDING") {
          userStatus = "pending"
        } else if (user.partner.status === "ACTIVE") {
          userStatus = "active"
        }
      } else {
        // Otherwise determine from sessions/login history
        if (user.sessions && user.sessions.length > 0) {
          const latestSession = user.sessions[0]
          if (new Date(latestSession.expires) > new Date()) {
            userStatus = "active"
          }
        }

        // Check if email is verified
        if (!user.emailVerified) {
          userStatus = "pending"
        }
      }

      // Get company name from appropriate relation
      let companyName = null
      if (user.role === "ADVERTISER" && user.advertiser) {
        companyName = user.advertiser.companyName
      } else if (user.role === "PARTNER" && user.partner) {
        companyName = user.partner.companyName
      }

      // Get last login time (using login history or session expiry as proxy)
      const lastLogin =
        user.loginHistory && user.loginHistory.length > 0
          ? user.loginHistory[0].timestamp
          : user.sessions && user.sessions.length > 0
            ? user.sessions[0].expires
            : null

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
        image: user.image,
        bio: user.bio,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        companyName,
        status: userStatus,
        lastLogin,
      }
    })

    return NextResponse.json({
      users: processedUsers,
      pagination: {
        total: totalCount,
        page,
        limit,
        pages: Math.ceil(totalCount / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    // Check authentication and admin permissions
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify admin role
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email as string },
      include: { admin: true },
    })

    if (!currentUser?.admin && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Parse request body
    const data = await req.json()
    const parsed = userCreateSchema.safeParse(data)

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parsed.error.format(),
        },
        { status: 400 },
      )
    }

    // Destructure validated data
    const {
      name,
      email,
      password,
      role,
      bio,
      sendWelcomeEmail,
      companyName,
      contactPerson,
      phoneNumber,
      address,
      city,
      state,
      postalCode,
      country,
      businessType,
      commissionRate,
      permissions,
    } = parsed.data

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json({ error: "User with this email already exists" }, { status: 400 })
    }

    // Hash password
    const hashedPassword = await hash(password, 10)

    // Create user with transaction to ensure related models are created
    const result = await prisma.$transaction(async (tx) => {
      // Create base user
      const user = await tx.user.create({
        data: {
          name: name || null,
          email,
          password: hashedPassword,
          role: role as UserRole,
          bio: bio || null,
        },
      })

      // Create role-specific record based on user role
      switch (role) {
        case "ADVERTISER":
          await tx.advertiser.create({
            data: {
              userId: user.id,
              companyName: companyName || user.name || "Unnamed Company",
              contactPerson: contactPerson || user.name || "Unnamed Contact",
              phoneNumber: phoneNumber || "",
              address: address || null,
              city: city || null,
              state: state || null,
              postalCode: postalCode || null,
              country: country || null,
            },
          })
          break

        case "PARTNER":
          await tx.partner.create({
            data: {
              userId: user.id,
              companyName: companyName || user.name || "Unnamed Partner",
              contactPerson: contactPerson || user.name || "Unnamed Contact",
              phoneNumber: phoneNumber || "",
              address: address || null,
              city: city || null,
              state: state || null,
              postalCode: postalCode || null,
              country: country || null,
              businessType: businessType || null,
              commissionRate: commissionRate ? Number(commissionRate) / 100 : 0.3,
            },
          })
          break

        case "ADMIN":
          // Handle both array and record formats for permissions
          let permissionsData: any = {}

          if (permissions) {
            if (Array.isArray(permissions)) {
              // Convert array to record format
              permissionsData = permissions.reduce((acc: Record<string, boolean>, perm: string) => {
                acc[perm] = true
                return acc
              }, {})
            } else {
              permissionsData = permissions
            }
          }

          await tx.admin.create({
            data: {
              userId: user.id,
              permissions: permissionsData,
            },
          })
          break
      }

      // Log activity
      await tx.activityLog.create({
        data: {
          userId: currentUser.id,
          action: "USER_CREATED",
          description: `Created new ${role.toLowerCase()} user: ${email}`,
          metadata: {
            createdUserId: user.id,
            userRole: role,
          },
        },
      })

      return user
    })

    // Send welcome email if requested
    if (sendWelcomeEmail) {
      // This would typically call an email service
      console.log(`Welcome email would be sent to ${email}`)
    }

    return NextResponse.json({
      success: true,
      user: {
        id: result.id,
        name: result.name,
        email: result.email,
        role: result.role,
      },
    })
  } catch (error) {
    console.error("Error creating user:", error)
    return NextResponse.json(
      { error: "Failed to create user", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!(await checkAdminAccess(session))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  try {
    const url = new URL(request.url)
    const userId = url.searchParams.get("id")

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    const body = await request.json()
    const parsed = userUpdateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parsed.error.format(),
        },
        { status: 400 },
      )
    }

    const {
      name,
      email,
      password,
      role,
      bio,
      companyName,
      contactPerson,
      phoneNumber,
      address,
      city,
      state,
      postalCode,
      country,
      businessType,
      commissionRate,
      permissions,
      isActive,
    } = parsed.data

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        advertiser: true,
        partner: true,
        admin: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Check if email is being changed and if new email is already in use
    if (email && email !== user.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email },
      })

      if (emailExists) {
        return NextResponse.json({ error: "Email address already in use" }, { status: 400 })
      }
    }

    // Prepare update data
    const updateData: any = {}

    if (name) updateData.name = name
    if (email) updateData.email = email
    if (bio !== undefined) updateData.bio = bio

    if (password) {
      updateData.password = await hash(password, 10)
    }

    if (role && role !== user.role) {
      // Role is changing, need to handle role-specific relations
      updateData.role = role

      // Delete old role-specific data
      if (user.role === "ADVERTISER" && user.advertiser) {
        await prisma.advertiser.delete({
          where: { id: user.advertiser.id },
        })
      } else if (user.role === "PARTNER" && user.partner) {
        await prisma.partner.delete({
          where: { id: user.partner.id },
        })
      } else if (user.role === "ADMIN" && user.admin) {
        await prisma.admin.delete({
          where: { id: user.admin.id },
        })
      }

      // Create new role-specific data
      if (role === "ADVERTISER") {
        if (!companyName && !user.advertiser) {
          return NextResponse.json(
            {
              error: "Company name is required when changing role to advertiser",
            },
            { status: 400 },
          )
        }

        await prisma.advertiser.create({
          data: {
            userId: user.id,
            companyName: companyName || "Default Company",
            contactPerson: contactPerson || name || user.name || "Contact Person",
            phoneNumber: phoneNumber || "0000000000",
            address,
            city,
            state,
            postalCode,
            country,
          },
        })
      } else if (role === "PARTNER") {
        if (!companyName && !user.partner) {
          return NextResponse.json(
            {
              error: "Company name is required when changing role to partner",
            },
            { status: 400 },
          )
        }

        await prisma.partner.create({
          data: {
            userId: user.id,
            companyName: companyName || "Default Company",
            contactPerson: contactPerson || name || user.name || "Contact Person",
            phoneNumber: phoneNumber || "0000000000",
            address,
            city,
            state,
            postalCode,
            country,
            businessType,
            commissionRate: commissionRate ? Number(commissionRate) / 100 : 0.3,
          },
        })
      } else if (role === "ADMIN") {
        // Handle both array and record formats for permissions
        let permissionsData: any = {}

        if (permissions) {
          if (Array.isArray(permissions)) {
            // Convert array to record format
            permissionsData = permissions.reduce((acc: Record<string, boolean>, perm: string) => {
              acc[perm] = true
              return acc
            }, {})
          } else {
            permissionsData = permissions
          }
        }

        await prisma.admin.create({
          data: {
            userId: user.id,
            permissions: permissionsData,
          },
        })
      }
    } else {
      // Role not changing, just update role-specific data if needed
      if (user.role === "ADVERTISER" && user.advertiser) {
        if (
          companyName ||
          contactPerson ||
          phoneNumber ||
          address !== undefined ||
          city !== undefined ||
          state !== undefined ||
          postalCode !== undefined ||
          country !== undefined
        ) {
          const advertiserUpdate: any = {}

          if (companyName) advertiserUpdate.companyName = companyName
          if (contactPerson) advertiserUpdate.contactPerson = contactPerson
          if (phoneNumber) advertiserUpdate.phoneNumber = phoneNumber
          if (address !== undefined) advertiserUpdate.address = address
          if (city !== undefined) advertiserUpdate.city = city
          if (state !== undefined) advertiserUpdate.state = state
          if (postalCode !== undefined) advertiserUpdate.postalCode = postalCode
          if (country !== undefined) advertiserUpdate.country = country

          await prisma.advertiser.update({
            where: { id: user.advertiser.id },
            data: advertiserUpdate,
          })
        }
      } else if (user.role === "PARTNER" && user.partner) {
        if (
          companyName ||
          contactPerson ||
          phoneNumber ||
          address !== undefined ||
          city !== undefined ||
          state !== undefined ||
          postalCode !== undefined ||
          country !== undefined ||
          businessType !== undefined ||
          commissionRate !== undefined
        ) {
          const partnerUpdate: any = {}

          if (companyName) partnerUpdate.companyName = companyName
          if (contactPerson) partnerUpdate.contactPerson = contactPerson
          if (phoneNumber) partnerUpdate.phoneNumber = phoneNumber
          if (address !== undefined) partnerUpdate.address = address
          if (city !== undefined) partnerUpdate.city = city
          if (state !== undefined) partnerUpdate.state = state
          if (postalCode !== undefined) partnerUpdate.postalCode = postalCode
          if (country !== undefined) partnerUpdate.country = country
          if (businessType !== undefined) partnerUpdate.businessType = businessType
          if (commissionRate !== undefined) partnerUpdate.commissionRate = Number(commissionRate) / 100

          await prisma.partner.update({
            where: { id: user.partner.id },
            data: partnerUpdate,
          })
        }
      } else if (user.role === "ADMIN" && user.admin && permissions) {
        // Handle both array and record formats for permissions
        let permissionsData: any = {}

        if (permissions) {
          if (Array.isArray(permissions)) {
            // Convert array to record format
            permissionsData = permissions.reduce((acc: Record<string, boolean>, perm: string) => {
              acc[perm] = true
              return acc
            }, {})
          } else {
            permissionsData = permissions
          }
        }

        await prisma.admin.update({
          where: { id: user.admin.id },
          data: {
            permissions: permissionsData,
          },
        })
      }
    }

    // Update the user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: {
        advertiser: true,
        partner: true,
        admin: true,
      },
    })

    // Log the update
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "USER_UPDATED",
        description: `Updated user: ${updatedUser.email}`,
        metadata: {
          updatedUserId: updatedUser.id,
          updatedFields: Object.keys(updateData),
        },
      },
    })

    // Remove password from response
    const { password: _, ...userWithoutPassword } = updatedUser

    return NextResponse.json(userWithoutPassword)
  } catch (error) {
    console.error("Error updating user:", error)
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!(await checkAdminAccess(session))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  try {
    const url = new URL(request.url)
    const userId = url.searchParams.get("id")

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Don't allow deleting self
    if (userId === session.user.id) {
      return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 })
    }

    // Log the deletion
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "USER_DELETED",
        description: `Deleted user: ${user.email}`,
        metadata: {
          deletedUserId: user.id,
          deletedUserEmail: user.email,
          deletedUserRole: user.role,
        },
      },
    })

    // Delete the user (this will cascade delete all related data due to prisma schema)
    await prisma.user.delete({
      where: { id: userId },
    })

    return NextResponse.json({ message: "User deleted successfully" })
  } catch (error) {
    console.error("Error deleting user:", error)
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 })
  }
}