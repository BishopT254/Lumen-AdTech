import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { z } from "zod";

// User update schema for validation
const userUpdateSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  image: z.string().url().optional(),
});

// Profile schemas for different roles
const advertiserProfileSchema = z.object({
  companyName: z.string().min(2).max(100).optional(),
  contactPerson: z.string().min(3).max(100).optional(),
  phoneNumber: z.string().min(10).max(20).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
});

const partnerProfileSchema = z.object({
  companyName: z.string().min(2).max(100).optional(),
  contactPerson: z.string().min(3).max(100).optional(),
  phoneNumber: z.string().min(10).max(20).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  paymentDetails: z.any().optional(),
});

// GET handler for fetching a user profile
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = params.id;
    
    // Users can only access their own profile, admins can access any
    if (session.user.id !== userId && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    
    // Fetch the user with role-specific profile
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        advertiser: true,
        partner: true,
        admin: true,
      }
    });
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    return NextResponse.json(user);
    
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch user profile" },
      { status: 500 }
    );
  }
}

// PUT handler for updating a user profile
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = params.id;
    
    // Users can only update their own profile, admins can update any
    if (session.user.id !== userId && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    
    // Fetch the existing user
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        advertiser: true,
        partner: true,
      }
    });
    
    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    // Parse and validate request body
    const body = await request.json();
    
    try {
      // Validate user data
      const { password, ...restUserData } = userUpdateSchema.parse(body);
      
      // Handle password update if provided
      const userData: any = { ...restUserData };
      if (password) {
        userData.password = await hash(password, 10);
      }
      
      // Check if email is being changed and if it's already in use
      if (userData.email && userData.email !== existingUser.email) {
        const emailExists = await prisma.user.findUnique({
          where: { email: userData.email }
        });
        
        if (emailExists) {
          return NextResponse.json({ 
            error: "Email address is already in use" 
          }, { status: 400 });
        }
      }
      
      // Process role-specific profile data
      let advertiserData;
      let partnerData;
      
      if (body.advertiser && existingUser.role === "ADVERTISER") {
        advertiserData = advertiserProfileSchema.parse(body.advertiser);
      }
      
      if (body.partner && existingUser.role === "PARTNER") {
        partnerData = partnerProfileSchema.parse(body.partner);
      }
      
      // Start a transaction to update both user and profile
      const updatedUser = await prisma.$transaction(async (tx) => {
        // Update the base user data
        const user = await tx.user.update({
          where: { id: userId },
          data: userData,
        });
        
        // Update role-specific profile if provided
        if (advertiserData && existingUser.advertiser) {
          await tx.advertiser.update({
            where: { id: existingUser.advertiser.id },
            data: advertiserData,
          });
        }
        
        if (partnerData && existingUser.partner) {
          await tx.partner.update({
            where: { id: existingUser.partner.id },
            data: partnerData,
          });
        }
        
        return user;
      });
      
      return NextResponse.json({
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        updatedAt: updatedUser.updatedAt,
      });
      
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
    console.error("Error updating user profile:", error);
    return NextResponse.json(
      { error: "Failed to update user profile" },
      { status: 500 }
    );
  }
} 