import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { z } from "zod";

// User creation schema for validation
const userCreationSchema = z.object({
  name: z.string().min(3).max(100),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["ADMIN", "ADVERTISER", "PARTNER"]),
  // Optional profile data
  profile: z.object({
    companyName: z.string().min(2).max(100).optional(),
    contactPerson: z.string().min(3).max(100).optional(),
    phoneNumber: z.string().min(10).max(20).optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    country: z.string().optional(),
    commissionRate: z.number().min(0).max(1).optional(), // Only for PARTNER
    paymentDetails: z.any().optional(), // Only for PARTNER
  }).optional(),
});

// GET handler for fetching users (admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated and is an admin
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role");
    const query: any = {};
    
    if (role) {
      query.role = role;
    }
    
    // Fetch users based on query parameters
    const users = await prisma.user.findMany({
      where: query,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        advertiser: {
          select: {
            companyName: true,
            contactPerson: true,
          }
        },
        partner: {
          select: {
            companyName: true,
            contactPerson: true,
          }
        },
      },
      orderBy: { createdAt: "desc" }
    });
    
    return NextResponse.json(users);
    
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

// POST handler for creating a new user (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated and is an admin
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    
    // Parse and validate request body
    const body = await request.json();
    
    try {
      const { profile, ...userData } = userCreationSchema.parse(body);
      
      // Check if email is already in use
      const emailExists = await prisma.user.findUnique({
        where: { email: userData.email }
      });
      
      if (emailExists) {
        return NextResponse.json({ 
          error: "Email address is already in use" 
        }, { status: 400 });
      }
      
      // Hash the password
      const hashedPassword = await hash(userData.password, 10);
      
      // Create user with role-specific profile in a transaction
      const newUser = await prisma.$transaction(async (tx) => {
        // Create the base user
        const user = await tx.user.create({
          data: {
            name: userData.name,
            email: userData.email,
            password: hashedPassword,
            role: userData.role,
          }
        });
        
        // Create role-specific profile if profile data is provided
        if (profile) {
          if (userData.role === "ADVERTISER") {
            await tx.advertiser.create({
              data: {
                userId: user.id,
                companyName: profile.companyName || user.name,
                contactPerson: profile.contactPerson || user.name,
                phoneNumber: profile.phoneNumber || "",
                address: profile.address,
                city: profile.city,
                country: profile.country,
              }
            });
          } else if (userData.role === "PARTNER") {
            await tx.partner.create({
              data: {
                userId: user.id,
                companyName: profile.companyName || user.name,
                contactPerson: profile.contactPerson || user.name,
                phoneNumber: profile.phoneNumber || "",
                address: profile.address,
                city: profile.city,
                country: profile.country,
                commissionRate: profile.commissionRate || 0.3, // Default 30%
                paymentDetails: profile.paymentDetails || {},
              }
            });
          } else if (userData.role === "ADMIN") {
            await tx.admin.create({
              data: {
                userId: user.id,
                permissions: ["USER_MANAGEMENT", "CONTENT_MODERATION", "FINANCE", "SYSTEM_SETTINGS"],
              }
            });
          }
        }
        
        return user;
      });
      
      return NextResponse.json({
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        createdAt: newUser.createdAt,
      }, { status: 201 });
      
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        return NextResponse.json(
          { error: "Validation failed", details: validationError.errors },
          { status: 400 }
        );
      }
      throw validationError;
    }
    
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
} 