import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// Import types correctly
import type { PaymentMethodType } from "@prisma/client";

// Validation schema for payment method creation
const cardSchema = z.object({
  number: z.string().regex(/^\d{16}$/),
  expMonth: z.number().int().min(1).max(12),
  expYear: z.number().int().min(new Date().getFullYear() % 100),
  cvc: z.string().regex(/^\d{3,4}$/),
  setDefault: z.boolean().optional()
});

// Schema for M-Pesa payment method
const mpesaSchema = z.object({
  phoneNumber: z.string().regex(/^(254|0)\d{9}$/, "Phone number must be a valid Kenyan number"),
  setDefault: z.boolean().optional()
});

// Schema for PayPal payment method
const paypalSchema = z.object({
  email: z.string().email("Invalid PayPal email address"),
  setDefault: z.boolean().optional()
});

// Schema for bank account payment method
const bankAccountSchema = z.object({
  accountName: z.string().min(3, "Account name must be at least 3 characters"),
  accountNumber: z.string().min(8, "Account number must be at least 8 characters"),
  bankName: z.string().min(3, "Bank name must be at least 3 characters"),
  branchCode: z.string().optional(),
  setDefault: z.boolean().optional()
});

// Combined payment method schema with discriminated union
const paymentMethodSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('CARD'), card: cardSchema }),
  z.object({ type: z.literal('MPESA'), mpesa: mpesaSchema }),
  z.object({ type: z.literal('PAYPAL'), paypal: paypalSchema }),
  z.object({ type: z.literal('FLUTTERWAVE'), flutterwave: cardSchema }),
  z.object({ type: z.literal('BANK_TRANSFER'), bankAccount: bankAccountSchema })
]);

// GET /api/advertiser/billing/payment-methods
// Get all payment methods for the authenticated advertiser
export async function GET(req: NextRequest) {
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

    // Get advertiser's payment methods
    const paymentMethods = await prisma.paymentMethod.findMany({
      where: { advertiserId: advertiser.id },
      orderBy: [
        { isDefault: "desc" },
        { createdAt: "desc" }
      ]
    });

    return NextResponse.json(paymentMethods);
  } catch (error) {
    console.error("Error fetching payment methods:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment methods" },
      { status: 500 }
    );
  }
}

// POST /api/advertiser/billing/payment-methods
// Add a new payment method
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
    const validationResult = paymentMethodSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const data = validationResult.data;
    
    // If this is set as default, unset any existing default
    let setDefault = false;
    
    // Process payment method based on type
    let paymentMethodData: any = {
      advertiserId: advertiser.id
    };
    
    // Handle each payment method type
    switch (data.type) {
      case 'CARD': {
        // In a real app, you would validate the card with the payment processor
        const { card } = data;
        // Map card brand to PaymentMethodType
        const cardBrand = getCardBrand(card.number);
        setDefault = !!card.setDefault;
        
        // Use the appropriate card brand as the PaymentMethodType
        paymentMethodData.type = getCardTypeFromBrand(cardBrand);
        paymentMethodData.last4 = card.number.slice(-4);
        paymentMethodData.expMonth = card.expMonth;
        paymentMethodData.expYear = card.expYear;
        paymentMethodData.cardBrand = cardBrand; // Store card brand as additional info
        break;
      }
      case 'FLUTTERWAVE': {
        const { flutterwave } = data;
        setDefault = !!flutterwave.setDefault;
        
        paymentMethodData.type = 'FLUTTERWAVE';
        paymentMethodData.last4 = flutterwave.number.slice(-4);
        paymentMethodData.expMonth = flutterwave.expMonth;
        paymentMethodData.expYear = flutterwave.expYear;
        break;
      }
      case 'MPESA': {
        const { mpesa } = data;
        setDefault = !!mpesa.setDefault;
        
        // Format M-Pesa phone number to standard format
        const formattedPhone = formatPhoneNumber(mpesa.phoneNumber);
        paymentMethodData.type = 'MPESA';
        paymentMethodData.last4 = formattedPhone.slice(-4);
        paymentMethodData.mpesaPhone = formattedPhone;
        break;
      }
      case 'PAYPAL': {
        const { paypal } = data;
        setDefault = !!paypal.setDefault;
        
        // Mask email for display purposes
        const maskedEmail = maskEmail(paypal.email);
        paymentMethodData.type = 'PAYPAL';
        paymentMethodData.last4 = paypal.email.slice(-4);
        paymentMethodData.paypalEmail = paypal.email;
        break;
      }
      case 'BANK_TRANSFER': {
        const { bankAccount } = data;
        setDefault = !!bankAccount.setDefault;
        
        paymentMethodData.type = 'BANK_TRANSFER';
        paymentMethodData.last4 = bankAccount.accountNumber.slice(-4);
        paymentMethodData.bankName = bankAccount.bankName;
        paymentMethodData.accountName = bankAccount.accountName;
        paymentMethodData.accountNumber = bankAccount.accountNumber;
        paymentMethodData.branchCode = bankAccount.branchCode;
        break;
      }
    }
    
    // Set default status
    paymentMethodData.isDefault = setDefault;

    // If setting this as default, unset any existing default
    if (setDefault) {
      await prisma.paymentMethod.updateMany({
        where: {
          advertiserId: advertiser.id,
          isDefault: true
        },
        data: {
          isDefault: false
        }
      });
    }

    // Create new payment method
    const paymentMethod = await prisma.paymentMethod.create({
      data: paymentMethodData
    });

    return NextResponse.json({
      success: true,
      paymentMethod: {
        id: paymentMethod.id,
        type: paymentMethod.type,
        last4: paymentMethod.last4,
        expMonth: paymentMethod.expMonth,
        expYear: paymentMethod.expYear,
        isDefault: paymentMethod.isDefault
      }
    });
  } catch (error) {
    console.error("Error adding payment method:", error);
    return NextResponse.json(
      { error: "Failed to add payment method" },
      { status: 500 }
    );
  }
}

// Helper function to determine card brand from card number
function getCardBrand(cardNumber: string): string {
  // Simplified logic to determine card brand
  const firstDigit = cardNumber.charAt(0);
  
  if (firstDigit === '4') {
    return 'Visa';
  } else if (firstDigit === '5') {
    return 'Mastercard';
  } else if (firstDigit === '3') {
    return 'American Express';
  } else {
    return 'Other';
  }
}

// Helper function to map card brand to PaymentMethodType
function getCardTypeFromBrand(brand: string): PaymentMethodType {
  switch (brand) {
    case 'Visa':
      return 'VISA';
    case 'Mastercard':
      return 'MASTERCARD';
    case 'American Express':
      return 'AMEX';
    default:
      return 'OTHER';
  }
}

// Helper function to format phone number to E.164 format for M-Pesa
function formatPhoneNumber(phoneNumber: string): string {
  // Convert to E.164 format
  if (phoneNumber.startsWith('0')) {
    return `254${phoneNumber.substring(1)}`;
  } else if (phoneNumber.startsWith('254')) {
    return phoneNumber;
  }
  return phoneNumber;
}

// Helper function to mask email for privacy
function maskEmail(email: string): string {
  const [username, domain] = email.split('@');
  if (username.length <= 3) {
    return `${username}****@${domain}`;
  }
  return `${username.substring(0, 3)}****@${domain}`;
} 