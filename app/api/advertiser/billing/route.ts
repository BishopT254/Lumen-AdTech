import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET /api/advertiser/billing
// Returns billing overview for the authenticated advertiser
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
      where: { userId: session.user.id },
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

    // Calculate account balance by summing up payment amounts and campaign charges
    // This is a simplified approach; in a real production system, you might have
    // more sophisticated accounting logic
    
    // Get payments (deposits)
    const payments = await prisma.payment.findMany({
      where: { 
        advertiserId: advertiser.id,
        status: "COMPLETED"
      },
      select: {
        id: true,
        amount: true,
        paymentMethod: true,
        dateCompleted: true,
        transactionId: true,
        status: true,
        receiptUrl: true
      },
      orderBy: { dateCompleted: "desc" }
    });
    
    // Get billings (campaign charges)
    const billings = await prisma.billing.findMany({
      where: { 
        advertiserId: advertiser.id 
      },
      select: {
        id: true,
        amount: true,
        invoiceNumber: true,
        status: true,
        dueDate: true,
        createdAt: true,
        campaign: {
          select: {
            name: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    // Calculate account balance
    const totalPayments = payments.reduce((sum, payment) => sum + payment.amount, 0);
    const totalCharges = billings.reduce((sum, billing) => sum + billing.amount, 0);
    const accountBalance = totalPayments - totalCharges;

    // Combine payments and billings into one transaction history array
    const billingHistory = [
      ...payments.map(payment => ({
        id: payment.id,
        date: payment.dateCompleted || payment.dateCompleted,
        amount: payment.amount,
        status: payment.status,
        description: "Account funding",
        type: "PAYMENT",
        paymentMethod: payment.paymentMethod,
        receiptUrl: payment.receiptUrl,
        transactionId: payment.transactionId
      })),
      ...billings.map(billing => ({
        id: billing.id,
        date: billing.createdAt,
        amount: -billing.amount, // Negative amount for charges
        status: billing.status,
        description: `Campaign: ${billing.campaign.name}`,
        type: "CHARGE",
        invoiceNumber: billing.invoiceNumber
      }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Return billing overview
    return NextResponse.json({
      accountBalance,
      paymentMethods: paymentMethods.map(method => ({
        id: method.id,
        type: method.type,
        last4: method.last4,
        expMonth: method.expMonth,
        expYear: method.expYear,
        isDefault: method.isDefault
      })),
      billingHistory
    });
  } catch (error) {
    console.error("Error fetching billing data:", error);
    return NextResponse.json(
      { error: "Failed to fetch billing data" },
      { status: 500 }
    );
  }
} 