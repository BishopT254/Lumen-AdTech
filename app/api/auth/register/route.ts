import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { type PrismaClient } from '@prisma/client';

// Validation schema
const registerSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(8, { message: "Password must be at least 8 characters" }),
  role: z.enum(['ADVERTISER', 'PARTNER', 'ADMIN']),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate request data
    const validation = registerSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { 
          message: "Validation failed", 
          errors: validation.error.format() 
        }, 
        { status: 400 }
      );
    }
    
    const { name, email, password, role } = validation.data;
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    
    if (existingUser) {
      return NextResponse.json(
        { message: "User with this email already exists" },
        { status: 409 }
      );
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user transaction
    const user = await prisma.$transaction(async (prismaClient: PrismaClient) => {
      // Create user
      const newUser = await prismaClient.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role,
        },
      });
      
      // Create profile based on role
      if (role === 'ADVERTISER') {
        await prismaClient.advertiser.create({
          data: {
            userId: newUser.id,
            companyName: `${name}'s Company`, // Default value
            contactPerson: name,
            phoneNumber: '', // To be updated later
          },
        });
      } else if (role === 'PARTNER') {
        await prismaClient.partner.create({
          data: {
            userId: newUser.id,
            companyName: `${name}'s Venue`, // Default value
            contactPerson: name,
            phoneNumber: '', // To be updated later
          },
        });
      } else if (role === 'ADMIN') {
        await prismaClient.admin.create({
          data: {
            userId: newUser.id,
            permissions: {}, // Default permissions
          },
        });
      }
      
      return newUser;
    });
    
    // Return success without exposing sensitive data
    return NextResponse.json(
      { 
        message: "User registered successfully",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        }
      },
      { status: 201 }
    );
    
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { message: "An error occurred during registration" },
      { status: 500 }
    );
  }
} 