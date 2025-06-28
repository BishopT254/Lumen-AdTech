/**
 * Payment Processing Module
 * 
 * This module provides payment processing capabilities for the Lumen AdTech Platform,
 * including billing, payments, and transaction management. It integrates with payment
 * gateways like M-Pesa and Stripe to facilitate financial transactions.
 */

import Stripe from 'stripe';
import { prisma } from './prisma';
import axios from 'axios';

// Initialize payment gateways
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

// M-Pesa API configuration
const mpesaConfig = {
  consumerKey: process.env.MPESA_CONSUMER_KEY || '',
  consumerSecret: process.env.MPESA_CONSUMER_SECRET || '',
  passKey: process.env.MPESA_PASSKEY || '',
  shortCode: process.env.MPESA_SHORTCODE || '',
  baseUrl: 'https://sandbox.safaricom.co.ke', // Change to production URL in production
};

/**
 * Process a payment using Stripe
 */
export async function processStripePayment(
  amount: number,
  currency: string,
  paymentMethodId: string,
  customerId: string,
  description: string
) {
  try {
    // Create a payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toLowerCase(),
      payment_method: paymentMethodId,
      customer: customerId,
      description,
      confirm: true,
    });
    
    // Record the payment in the database
    if (paymentIntent.status === 'succeeded') {
      const payment = await prisma.payment.create({
        data: {
          amount,
          currency,
          status: 'COMPLETED',
          method: 'STRIPE',
          transactionId: paymentIntent.id,
          description,
          metadata: {
            customerId,
            paymentMethodId,
            stripeResponse: paymentIntent,
          },
        },
      });
      
      return {
        success: true,
        paymentId: payment.id,
        transactionId: paymentIntent.id,
        status: 'COMPLETED',
      };
    } else {
      // Payment is processing or requires action
      return {
        success: false,
        status: paymentIntent.status,
        clientSecret: paymentIntent.client_secret,
        message: 'Payment requires additional action or is still processing',
      };
    }
  } catch (error) {
    console.error('Stripe payment processing error:', error);
    
    // Record the failed payment
    await prisma.payment.create({
      data: {
        amount,
        currency,
        status: 'FAILED',
        method: 'STRIPE',
        description,
        metadata: {
          customerId,
          paymentMethodId,
          error: String(error),
        },
      },
    });
    
    throw error;
  }
}

/**
 * Process a payment using M-Pesa
 */
export async function processMpesaPayment(
  amount: number,
  phoneNumber: string,
  description: string,
  accountReference: string
) {
  try {
    // Format phone number to required format (254XXXXXXXXX)
    const formattedPhone = formatPhoneNumber(phoneNumber);
    
    // Get M-Pesa access token
    const accessToken = await getMpesaAccessToken();
    
    // Generate timestamp
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    
    // Generate password
    const password = Buffer.from(
      mpesaConfig.shortCode + mpesaConfig.passKey + timestamp
    ).toString('base64');
    
    // Make STK Push request
    const response = await axios.post(
      `${mpesaConfig.baseUrl}/mpesa/stkpush/v1/processrequest`,
      {
        BusinessShortCode: mpesaConfig.shortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: Math.round(amount),
        PartyA: formattedPhone,
        PartyB: mpesaConfig.shortCode,
        PhoneNumber: formattedPhone,
        CallBackURL: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/mpesa-callback`,
        AccountReference: accountReference,
        TransactionDesc: description,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    // Record the payment initiation
    const payment = await prisma.payment.create({
      data: {
        amount,
        currency: 'KES',
        status: 'PENDING',
        method: 'MPESA',
        transactionId: response.data.CheckoutRequestID,
        description,
        metadata: {
          phoneNumber: formattedPhone,
          accountReference,
          mpesaResponse: response.data,
        },
      },
    });
    
    return {
      success: true,
      paymentId: payment.id,
      checkoutRequestId: response.data.CheckoutRequestID,
      merchantRequestId: response.data.MerchantRequestID,
      responseCode: response.data.ResponseCode,
      responseDescription: response.data.ResponseDescription,
      status: 'PENDING',
    };
  } catch (error) {
    console.error('M-Pesa payment processing error:', error);
    
    // Record the failed payment
    await prisma.payment.create({
      data: {
        amount,
        currency: 'KES',
        status: 'FAILED',
        method: 'MPESA',
        description,
        metadata: {
          phoneNumber,
          accountReference,
          error: String(error),
        },
      },
    });
    
    throw error;
  }
}

/**
 * Get M-Pesa access token
 */
async function getMpesaAccessToken() {
  try {
    const auth = Buffer.from(
      `${mpesaConfig.consumerKey}:${mpesaConfig.consumerSecret}`
    ).toString('base64');
    
    const response = await axios.get(
      `${mpesaConfig.baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
      {
        headers: {
          Authorization: `Basic ${auth}`,
        },
      }
    );
    
    return response.data.access_token;
  } catch (error) {
    console.error('Error getting M-Pesa access token:', error);
    throw error;
  }
}

/**
 * Format phone number to M-Pesa required format
 */
function formatPhoneNumber(phoneNumber: string): string {
  // Remove any non-numeric characters
  const numericOnly = phoneNumber.replace(/\D/g, '');
  
  // If the number starts with 0, replace it with 254
  if (numericOnly.startsWith('0')) {
    return '254' + numericOnly.substring(1);
  }
  
  // If the number starts with +, remove it
  if (phoneNumber.startsWith('+')) {
    return numericOnly;
  }
  
  return numericOnly;
}

/**
 * Handle M-Pesa callback
 */
export async function handleMpesaCallback(callbackData: any) {
  try {
    const resultCode = callbackData.Body.stkCallback.ResultCode;
    const checkoutRequestId = callbackData.Body.stkCallback.CheckoutRequestID;
    
    // Find the payment record
    const payment = await prisma.payment.findFirst({
      where: {
        transactionId: checkoutRequestId,
        method: 'MPESA',
      },
    });
    
    if (!payment) {
      throw new Error(`Payment with CheckoutRequestID ${checkoutRequestId} not found`);
    }
    
    // Update payment status based on result code
    if (resultCode === 0) {
      // Payment successful
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          metadata: {
            ...payment.metadata as any,
            callbackData,
          },
        },
      });
      
      // Create billing record if this payment is linked to an advertiser
      if (payment.advertiserId) {
        await prisma.billing.create({
          data: {
            advertiserId: payment.advertiserId,
            amount: payment.amount,
            currency: payment.currency,
            type: 'DEPOSIT',
            status: 'COMPLETED',
            paymentId: payment.id,
            description: payment.description || 'M-Pesa payment',
          },
        });
      }
      
      return {
        success: true,
        paymentId: payment.id,
        status: 'COMPLETED',
      };
    } else {
      // Payment failed
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'FAILED',
          metadata: {
            ...payment.metadata as any,
            callbackData,
            errorCode: resultCode,
            errorMessage: callbackData.Body.stkCallback.ResultDesc,
          },
        },
      });
      
      return {
        success: false,
        paymentId: payment.id,
        status: 'FAILED',
        errorCode: resultCode,
        errorMessage: callbackData.Body.stkCallback.ResultDesc,
      };
    }
  } catch (error) {
    console.error('M-Pesa callback handling error:', error);
    throw error;
  }
}

/**
 * Generate a billing statement for an advertiser
 */
export async function generateBillingStatement(advertiserId: string, startDate: Date, endDate: Date) {
  try {
    // Get the advertiser
    const advertiser = await prisma.advertiser.findUnique({
      where: { id: advertiserId },
      include: {
        user: true,
      },
    });
    
    if (!advertiser) {
      throw new Error(`Advertiser with ID ${advertiserId} not found`);
    }
    
    // Get all campaigns for this advertiser that were active during the period
    const campaigns = await prisma.campaign.findMany({
      where: {
        advertiserId,
        OR: [
          {
            status: {
              in: ['ACTIVE', 'PAUSED', 'COMPLETED'],
            },
            startDate: {
              lte: endDate,
            },
            endDate: {
              gte: startDate,
            },
          },
          {
            status: 'COMPLETED',
            endDate: {
              gte: startDate,
              lte: endDate,
            },
          },
        ],
      },
      include: {
        adDeliveries: {
          where: {
            scheduledTime: {
              gte: startDate,
              lte: endDate,
            },
          },
        },
      },
    });
    
    // Get all payments during the period
    const payments = await prisma.payment.findMany({
      where: {
        advertiserId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });
    
    // Get all billing transactions during the period
    const billingTransactions = await prisma.billing.findMany({
      where: {
        advertiserId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });
    
    // Calculate summary metrics
    const campaignCosts = campaigns.map(campaign => {
      const impressions = campaign.adDeliveries.reduce((sum, delivery) => sum + delivery.impressions, 0);
      const engagements = campaign.adDeliveries.reduce((sum, delivery) => sum + delivery.engagements, 0);
      const completions = campaign.adDeliveries.reduce((sum, delivery) => sum + delivery.completions, 0);
      
      let cost = 0;
      
      // Calculate cost based on pricing model
      switch (campaign.pricingModel) {
        case 'CPM':
          // Cost per thousand impressions (assume $5 per 1000 impressions)
          cost = (impressions / 1000) * 5;
          break;
        case 'CPE':
          // Cost per engagement (assume $0.5 per engagement)
          cost = engagements * 0.5;
          break;
        case 'CPA':
          // Cost per action/completion (assume $2 per completion)
          cost = completions * 2;
          break;
        case 'HYBRID':
          // Mix of CPM and CPE (assume $2 per 1000 impressions and $0.25 per engagement)
          cost = ((impressions / 1000) * 2) + (engagements * 0.25);
          break;
      }
      
      return {
        campaignId: campaign.id,
        campaignName: campaign.name,
        status: campaign.status,
        impressions,
        engagements,
        completions,
        pricingModel: campaign.pricingModel,
        cost,
      };
    });
    
    const totalCost = campaignCosts.reduce((sum, campaign) => sum + campaign.cost, 0);
    const totalPayments = payments.reduce((sum, payment) => {
      if (payment.status === 'COMPLETED') {
        return sum + payment.amount;
      }
      return sum;
    }, 0);
    
    const openingBalance = await calculateOpeningBalance(advertiserId, startDate);
    const closingBalance = openingBalance + totalPayments - totalCost;
    
    // Generate a statement ID
    const statementId = `INV-${Date.now().toString(36).toUpperCase()}`;
    
    // Create the billing statement
    const statement = {
      statementId,
      advertiserId,
      advertiserName: advertiser.companyName,
      contactName: advertiser.user.name,
      contactEmail: advertiser.user.email,
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      summary: {
        openingBalance,
        totalPayments,
        totalCosts: totalCost,
        closingBalance,
      },
      campaigns: campaignCosts,
      payments: payments.map(payment => ({
        id: payment.id,
        date: payment.createdAt,
        amount: payment.amount,
        method: payment.method,
        status: payment.status,
        description: payment.description,
      })),
      transactions: billingTransactions.map(transaction => ({
        id: transaction.id,
        date: transaction.createdAt,
        amount: transaction.amount,
        type: transaction.type,
        status: transaction.status,
        description: transaction.description,
      })),
      generatedAt: new Date().toISOString(),
    };
    
    // Store the statement in the database
    await prisma.billing.create({
      data: {
        advertiserId,
        amount: totalCost,
        currency: 'USD', // Default currency
        type: 'INVOICE',
        status: 'PENDING',
        description: `Billing statement for period ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
        metadata: statement,
      },
    });
    
    return statement;
  } catch (error) {
    console.error('Billing statement generation error:', error);
    throw error;
  }
}

/**
 * Calculate opening balance for an advertiser at a specific date
 */
async function calculateOpeningBalance(advertiserId: string, date: Date): Promise<number> {
  try {
    // Get all payments before the date
    const payments = await prisma.payment.findMany({
      where: {
        advertiserId,
        createdAt: {
          lt: date,
        },
        status: 'COMPLETED',
      },
    });
    
    // Get all billing transactions before the date
    const billingTransactions = await prisma.billing.findMany({
      where: {
        advertiserId,
        createdAt: {
          lt: date,
        },
      },
    });
    
    // Calculate the balance
    const totalPayments = payments.reduce((sum, payment) => sum + payment.amount, 0);
    
    const totalCosts = billingTransactions.reduce((sum, transaction) => {
      if (transaction.type === 'CHARGE') {
        return sum + transaction.amount;
      }
      return sum;
    }, 0);
    
    return totalPayments - totalCosts;
  } catch (error) {
    console.error('Opening balance calculation error:', error);
    throw error;
  }
}

/**
 * Calculate partner earnings for a specific period
 */
export async function calculatePartnerEarnings(partnerId: string, startDate: Date, endDate: Date) {
  try {
    // Get the partner
    const partner = await prisma.partner.findUnique({
      where: { id: partnerId },
      include: {
        devices: {
          include: {
            adDeliveries: {
              where: {
                scheduledTime: {
                  gte: startDate,
                  lte: endDate,
                },
                status: 'DELIVERED',
              },
              include: {
                campaign: true,
              },
            },
          },
        },
      },
    });
    
    if (!partner) {
      throw new Error(`Partner with ID ${partnerId} not found`);
    }
    
    // Calculate earnings for each device
    const deviceEarnings = partner.devices.map(device => {
      const deliveries = device.adDeliveries;
      
      let totalImpressions = 0;
      let totalEarnings = 0;
      
      // Group deliveries by campaign
      const campaignDeliveries: Record<string, any[]> = {};
      
      deliveries.forEach(delivery => {
        const campaignId = delivery.campaign.id;
        if (!campaignDeliveries[campaignId]) {
          campaignDeliveries[campaignId] = [];
        }
        campaignDeliveries[campaignId].push(delivery);
        totalImpressions += delivery.impressions;
      });
      
      // Calculate earnings for each campaign
      const campaignEarnings = Object.entries(campaignDeliveries).map(([campaignId, campaignDeliveries]) => {
        const campaign = campaignDeliveries[0].campaign;
        const impressions = campaignDeliveries.reduce((sum, delivery) => sum + delivery.impressions, 0);
        const engagements = campaignDeliveries.reduce((sum, delivery) => sum + delivery.engagements, 0);
        const completions = campaignDeliveries.reduce((sum, delivery) => sum + delivery.completions, 0);
        
        let campaignRevenue = 0;
        
        // Calculate revenue based on pricing model
        switch (campaign.pricingModel) {
          case 'CPM':
            // Revenue per thousand impressions (assume $5 per 1000 impressions)
            campaignRevenue = (impressions / 1000) * 5;
            break;
          case 'CPE':
            // Revenue per engagement (assume $0.5 per engagement)
            campaignRevenue = engagements * 0.5;
            break;
          case 'CPA':
            // Revenue per action/completion (assume $2 per completion)
            campaignRevenue = completions * 2;
            break;
          case 'HYBRID':
            // Mix of CPM and CPE (assume $2 per 1000 impressions and $0.25 per engagement)
            campaignRevenue = ((impressions / 1000) * 2) + (engagements * 0.25);
            break;
        }
        
        // Apply partner commission rate
        const earnings = campaignRevenue * partner.commissionRate;
        totalEarnings += earnings;
        
        return {
          campaignId,
          campaignName: campaign.name,
          impressions,
          engagements,
          completions,
          revenue: campaignRevenue,
          earnings,
        };
      });
      
      return {
        deviceId: device.id,
        deviceName: device.name,
        impressions: totalImpressions,
        earnings: totalEarnings,
        campaigns: campaignEarnings,
      };
    });
    
    // Calculate total earnings
    const totalEarnings = deviceEarnings.reduce((sum, device) => sum + device.earnings, 0);
    
    // Generate an earnings statement
    const earningsStatement = {
      partnerId,
      partnerName: partner.companyName,
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      commissionRate: partner.commissionRate,
      summary: {
        totalDevices: partner.devices.length,
        activeDevices: partner.devices.filter(device => device.adDeliveries.length > 0).length,
        totalImpressions: deviceEarnings.reduce((sum, device) => sum + device.impressions, 0),
        totalEarnings,
      },
      devices: deviceEarnings,
      generatedAt: new Date().toISOString(),
    };
    
    // Store the earnings record in the database
    await prisma.partnerEarning.create({
      data: {
        partnerId,
        amount: totalEarnings,
        currency: 'USD', // Default currency
        status: 'PENDING',
        startDate,
        endDate,
        metadata: earningsStatement,
      },
    });
    
    return earningsStatement;
  } catch (error) {
    console.error('Partner earnings calculation error:', error);
    throw error;
  }
}

/**
 * Process partner payment
 */
export async function processPartnerPayment(partnerId: string, earningId: string, paymentDetails: any) {
  try {
    // Get the partner earning record
    const earning = await prisma.partnerEarning.findUnique({
      where: { id: earningId },
      include: {
        partner: true,
      },
    });
    
    if (!earning) {
      throw new Error(`Partner earning with ID ${earningId} not found`);
    }
    
    if (earning.partnerId !== partnerId) {
      throw new Error(`Partner earning does not belong to partner ${partnerId}`);
    }
    
    if (earning.status !== 'PENDING') {
      throw new Error(`Partner earning is not in PENDING status`);
    }
    
    // Process the payment based on payment method
    let paymentStatus = 'PROCESSING';
    let paymentReference = '';
    
    switch (paymentDetails.method) {
      case 'BANK_TRANSFER':
        // Record bank transfer details
        paymentReference = `BANK-${Date.now().toString(36).toUpperCase()}`;
        paymentStatus = 'PROCESSING'; // Will be updated to COMPLETED when confirmed
        break;
      case 'MPESA':
        // Process M-Pesa payment
        const mpesaResult = await processMpesaB2C(
          earning.partner.paymentDetails?.phoneNumber || paymentDetails.phoneNumber,
          earning.amount,
          `Partner payment for ${earning.startDate.toISOString().split('T')[0]} to ${earning.endDate.toISOString().split('T')[0]}`
        );
        paymentReference = mpesaResult.transactionId;
        paymentStatus = mpesaResult.status === 'success' ? 'COMPLETED' : 'PROCESSING';
        break;
      case 'PAYPAL':
        // Record PayPal payment details
        paymentReference = `PAYPAL-${Date.now().toString(36).toUpperCase()}`;
        paymentStatus = 'PROCESSING'; // Will be updated to COMPLETED when confirmed
        break;
      default:
        throw new Error(`Unsupported payment method: ${paymentDetails.method}`);
    }
    
    // Update the earning record
    await prisma.partnerEarning.update({
      where: { id: earningId },
      data: {
        status: paymentStatus,
        paymentReference,
        paidAt: paymentStatus === 'COMPLETED' ? new Date() : null,
        paymentDetails: {
          method: paymentDetails.method,
          ...paymentDetails,
          processedAt: new Date().toISOString(),
        },
      },
    });
    
    return {
      success: true,
      earningId,
      paymentReference,
      status: paymentStatus,
      amount: earning.amount,
      currency: earning.currency,
      partnerId: earning.partnerId,
      partnerName: earning.partner.companyName,
      processedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Partner payment processing error:', error);
    throw error;
  }
}

/**
 * Process M-Pesa B2C payment (business to customer)
 */
async function processMpesaB2C(phoneNumber: string, amount: number, remarks: string) {
  try {
    // Format phone number
    const formattedPhone = formatPhoneNumber(phoneNumber);
    
    // Get M-Pesa access token
    const accessToken = await getMpesaAccessToken();
    
    // Generate timestamp
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    
    // Make B2C request
    const response = await axios.post(
      `${mpesaConfig.baseUrl}/mpesa/b2c/v1/paymentrequest`,
      {
        InitiatorName: 'TestInitiator',
        SecurityCredential: 'Security credential', // Should be generated based on certificate
        CommandID: 'BusinessPayment',
        Amount: Math.round(amount),
        PartyA: mpesaConfig.shortCode,
        PartyB: formattedPhone,
        Remarks: remarks,
        QueueTimeOutURL: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/mpesa-b2c-timeout`,
        ResultURL: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/mpesa-b2c-result`,
        Occasion: 'Partner Payment',
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    return {
      transactionId: response.data.OriginatorConversationID,
      conversationId: response.data.ConversationID,
      responseCode: response.data.ResponseCode,
      responseDescription: response.data.ResponseDescription,
      status: response.data.ResponseCode === '0' ? 'success' : 'pending',
    };
  } catch (error) {
    console.error('M-Pesa B2C payment error:', error);
    throw error;
  }
} 