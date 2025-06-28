import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { PaymentMethod, PaymentStatus } from "@prisma/client";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

// Validation schema for payment creation
const paymentSchema = z.object({
  amount: z.number().positive(),
  paymentMethodId: z.string().optional(),
  cardDetails: z.object({
    number: z.string().regex(/^\d{16}$/),
    expMonth: z.number().int().min(1).max(12),
    expYear: z.number().int().min(new Date().getFullYear() % 100),
    cvc: z.string().regex(/^\d{3,4}$/),
    saveCard: z.boolean().optional()
  }).optional()
});

// POST /api/advertiser/billing/payments
// Process a payment (add funds)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

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

    // Parse and validate request body
    const body = await req.json();
    const validationResult = paymentSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const data = validationResult.data;
    let paymentMethodId = data.paymentMethodId;
    let paymentMethodType: PaymentMethod;

    // If using a new card, create the payment method
    if (!paymentMethodId && data.cardDetails) {
      // In a real app, you would integrate with a payment processor like Stripe
      // Here we're just simulating the process
      
      // Get card type from card number (simplified logic)
      const cardType = getCardType(data.cardDetails.number);
      
      // Get last 4 digits of card number
      const last4 = data.cardDetails.number.slice(-4);

      // Create new payment method
      if (data.cardDetails.saveCard) {
        const newPaymentMethod = await prisma.paymentMethod.create({
          data: {
            advertiserId: advertiser.id,
            type: cardType,
            last4,
            expMonth: data.cardDetails.expMonth,
            expYear: data.cardDetails.expYear,
            isDefault: false // New cards are not default by default
          }
        });
        
        paymentMethodId = newPaymentMethod.id;
        paymentMethodType = cardType;
      } else {
        // For one-time payments, still set the payment method type
        paymentMethodType = cardType;
      }
    } else if (paymentMethodId) {
      // Verify the payment method exists and belongs to the advertiser
      const paymentMethod = await prisma.paymentMethod.findUnique({
        where: {
          id: paymentMethodId,
          advertiserId: advertiser.id
        }
      });

      if (!paymentMethod) {
        return NextResponse.json(
          { error: "Payment method not found or does not belong to you" },
          { status: 400 }
        );
      }
      
      paymentMethodType = paymentMethod.type;
    } else {
      return NextResponse.json(
        { error: "Either existing payment method ID or new card details are required" },
        { status: 400 }
      );
    }

    // In a real application, you would process the payment with a payment provider
    // For this demo, we'll simulate a successful payment
    
    // Generate a receipt URL (in a real app, this would be a link to a PDF receipt)
    const receiptUrl = `/receipts/payment-${uuidv4()}.pdf`;

    // Create the payment record
    const payment = await prisma.payment.create({
      data: {
        advertiserId: advertiser.id,
        amount: data.amount,
        paymentMethod: paymentMethodType,
        paymentMethodId: paymentMethodId,
        status: PaymentStatus.COMPLETED, // In a real app, this might start as PENDING
        transactionId: `txn_${uuidv4().replace(/-/g, '')}`,
        dateInitiated: new Date(),
        dateCompleted: new Date(), // In a real app, this would be set later
        receiptUrl,
        notes: "Added funds via API"
      }
    });

    return NextResponse.json({
      success: true,
      payment: {
        id: payment.id,
        amount: payment.amount,
        status: payment.status,
        transactionId: payment.transactionId,
        dateCompleted: payment.dateCompleted,
        receiptUrl: payment.receiptUrl
      }
    });
  } catch (error) {
    console.error("Error processing payment:", error);
    return NextResponse.json(
      { error: "Failed to process payment" },
      { status: 500 }
    );
  }
}

// Helper function to determine card type from card number
function getCardType(cardNumber: string): PaymentMethod {
  // Very simplified logic for demo purposes
  const firstDigit = cardNumber.charAt(0);
  
  if (firstDigit === '4') {
    return PaymentMethod.VISA;
  } else if (firstDigit === '5') {
    return PaymentMethod.MASTERCARD;
  } else if (firstDigit === '3') {
    return PaymentMethod.AMEX;
  } else {
    return PaymentMethod.OTHER;
  }
} 