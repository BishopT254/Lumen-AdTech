import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/prisma";

// DELETE /api/advertiser/billing/payment-methods/[id]
// Delete a payment method
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = params;

    // Check if user is authenticated
    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Check if user is an advertiser
    if (session.user.role !== "ADVERTISER") {
      return NextResponse.json(
        { error: "Access denied. Advertiser role required." },
        { status: 403 }
      );
    }

    // Get advertiser ID
    const advertiser = await prisma.advertiser.findUnique({
      where: { userId: session.user.id }
    });

    if (!advertiser) {
      return NextResponse.json(
        { error: "Advertiser profile not found" },
        { status: 404 }
      );
    }

    // First, check if payment method exists and belongs to the advertiser
    const paymentMethod = await prisma.paymentMethod.findUnique({
      where: {
        id,
        advertiserId: advertiser.id
      }
    });

    if (!paymentMethod) {
      return NextResponse.json(
        { error: "Payment method not found or does not belong to you" },
        { status: 404 }
      );
    }

    // If this is the default payment method, don't allow deletion unless there are no other payment methods
    if (paymentMethod.isDefault) {
      const otherPaymentMethodsCount = await prisma.paymentMethod.count({
        where: {
          advertiserId: advertiser.id,
          id: {
            not: id
          }
        }
      });

      if (otherPaymentMethodsCount > 0) {
        return NextResponse.json(
          { error: "Cannot delete default payment method. Set another payment method as default first." },
          { status: 400 }
        );
      }
    }

    // Delete the payment method
    await prisma.paymentMethod.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: "Payment method deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting payment method:", error);
    return NextResponse.json(
      { error: "Failed to delete payment method" },
      { status: 500 }
    );
  }
}

// PATCH /api/advertiser/billing/payment-methods/[id]
// Update a payment method (e.g., set as default)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = params;

    // Check if user is authenticated
    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Check if user is an advertiser
    if (session.user.role !== "ADVERTISER") {
      return NextResponse.json(
        { error: "Access denied. Advertiser role required." },
        { status: 403 }
      );
    }

    // Get advertiser ID
    const advertiser = await prisma.advertiser.findUnique({
      where: { userId: session.user.id }
    });

    if (!advertiser) {
      return NextResponse.json(
        { error: "Advertiser profile not found" },
        { status: 404 }
      );
    }

    // Check if payment method exists and belongs to the advertiser
    const paymentMethod = await prisma.paymentMethod.findUnique({
      where: {
        id,
        advertiserId: advertiser.id
      }
    });

    if (!paymentMethod) {
      return NextResponse.json(
        { error: "Payment method not found or does not belong to you" },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await req.json();
    
    // Only support setting as default for now
    if (body.isDefault === true) {
      // First, unset any existing default
      await prisma.paymentMethod.updateMany({
        where: {
          advertiserId: advertiser.id,
          isDefault: true
        },
        data: {
          isDefault: false
        }
      });

      // Set this one as default
      await prisma.paymentMethod.update({
        where: { id },
        data: {
          isDefault: true
        }
      });

      return NextResponse.json({
        success: true,
        message: "Payment method set as default"
      });
    }

    return NextResponse.json(
      { error: "Invalid update operation" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error updating payment method:", error);
    return NextResponse.json(
      { error: "Failed to update payment method" },
      { status: 500 }
    );
  }
} 