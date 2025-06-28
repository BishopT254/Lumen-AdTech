'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import { toast } from 'sonner';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { usePublicSettings } from '@/hooks/usePublicSettings';

// UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import LoadingState from '@/components/loading-state';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Icons
import { Plus, CreditCard, CheckCircle, AlertCircle, Receipt, Trash, Check, Phone, Globe, Building, Wallet } from 'lucide-react';

// Define types manually to match Prisma schema
type PaymentMethodType = 'VISA' | 'MASTERCARD' | 'AMEX' | 'MPESA' | 'FLUTTERWAVE' | 'PAYPAL' | 'BANK_TRANSFER' | 'OTHER';
type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
type BillingStatus = 'UNPAID' | 'PAID' | 'OVERDUE' | 'CANCELLED' | 'PARTIALLY_PAID';

// Validation schema for new payment method
const cardSchema = z.object({
  number: z.string().regex(/^\d{16}$/, 'Card number must be 16 digits'),
  expMonth: z.number().int().min(1).max(12, 'Month must be between 1-12'),
  expYear: z.number().int().min(new Date().getFullYear() % 100, 'Year cannot be in the past'),
  cvc: z.string().regex(/^\d{3,4}$/, 'CVC must be 3-4 digits'),
  setDefault: z.boolean().optional()
});

// Validation schema for payment amount
const paymentSchema = z.object({
  amount: z.number().positive('Amount must be positive')
});

// Type for BillingData from API
interface BillingData {
  accountBalance: number;
  billingHistory: Array<{
    id: string;
    date: string;
    amount: number;
    status: string;
    description: string;
    type: 'PAYMENT' | 'CHARGE';
    paymentMethod?: PaymentMethodType;
    receiptUrl?: string;
    invoiceNumber?: string;
  }>;
  paymentMethods: Array<{
    id: string;
    type: PaymentMethodType;
    last4: string;
    expMonth?: number;
    expYear?: number;
    isDefault: boolean;
    mpesaPhone?: string;
    paypalEmail?: string;
    bankName?: string;
    accountName?: string;
    cardBrand?: string;
  }>;
}

export default function AdvertiserBilling() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { generalSettings, paymentGateway, systemSettings, loading: settingsLoading, error: settingsError } = usePublicSettings();
  
  // State variables
  const [isLoading, setIsLoading] = useState(true);
  const [billingData, setBillingData] = useState<BillingData | null>(null);
  const [activePaymentMethod, setActivePaymentMethod] = useState<string>('');
  const [amount, setAmount] = useState<string>('500');
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [isAddingFunds, setIsAddingFunds] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('card');
  
  // Card form state
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpMonth, setCardExpMonth] = useState('');
  const [cardExpYear, setCardExpYear] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [saveAsDefault, setSaveAsDefault] = useState(false);

  // M-Pesa form state
  const [mpesaPhone, setMpesaPhone] = useState('');
  
  // PayPal form state
  const [paypalEmail, setPaypalEmail] = useState('');
  
  // Bank Transfer form state
  const [bankName, setBankName] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [branchCode, setBranchCode] = useState('');
  
  // Flutterwave form state (using the same card fields)
  
  // Check if system is in maintenance mode
  if (systemSettings?.maintenanceMode) {
    return (
      <div className="container mx-auto py-8">
        <Alert className="mb-8">
          <AlertTitle>System Maintenance</AlertTitle>
          <AlertDescription>
            The billing dashboard is currently unavailable due to scheduled maintenance.
            {systemSettings.maintenanceDay && systemSettings.maintenanceTime && (
              <> Maintenance is scheduled for {systemSettings.maintenanceDay} at {systemSettings.maintenanceTime}.</>
            )}
            Please check back later.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Loading settings state
  if (settingsLoading) {
    return <LoadingState message="Loading billing settings..." />;
  }

  // Settings error state
  if (settingsError) {
    console.error("Error loading system settings:", settingsError);
  }
  
  // Fetch billing data on component mount
  useEffect(() => {
    if (status === 'authenticated') {
      fetchBillingData();
    } else if (status === 'unauthenticated') {
      // Redirect to login if not authenticated
      router.push('/login');
    }
  }, [status, router]);
  
  // Fetch billing data from API
  const fetchBillingData = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get('/api/advertiser/billing');
      setBillingData(response.data);
      
      // Set active payment method to the default one if available
      const defaultMethod = response.data.paymentMethods.find((method: any) => method.isDefault);
      if (defaultMethod) {
        setActivePaymentMethod(defaultMethod.id);
      } else if (response.data.paymentMethods.length > 0) {
        setActivePaymentMethod(response.data.paymentMethods[0].id);
      }
    } catch (error) {
      console.error('Error fetching billing data:', error);
      toast.error('Failed to load billing data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle adding a new payment method
  const handleAddPaymentMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsAddingCard(true);
      
      // Create the appropriate payload based on the active tab
      let payload;
      
      switch (activeTab) {
        case 'card':
          // Validate form data
          const cardValidation = z.object({
            number: z.string().regex(/^\d{16}$/, 'Card number must be 16 digits'),
            expMonth: z.number().int().min(1).max(12, 'Month must be between 1-12'),
            expYear: z.number().int().min(new Date().getFullYear() % 100, 'Year cannot be in the past'),
            cvc: z.string().regex(/^\d{3,4}$/, 'CVC must be 3-4 digits'),
            setDefault: z.boolean().optional()
          }).safeParse({
            number: cardNumber,
            expMonth: parseInt(cardExpMonth),
            expYear: parseInt(cardExpYear),
            cvc: cardCvc,
            setDefault: saveAsDefault
          });
          
          if (!cardValidation.success) {
            throw new Error(cardValidation.error.errors[0].message);
          }
          
          payload = {
            type: 'CARD',
            card: cardValidation.data
          };
          break;
          
        case 'mpesa':
          // Validate M-Pesa phone number
          const mpesaValidation = z.object({
            phoneNumber: z.string().regex(/^(254|0)\d{9}$/, 'Phone number must be a valid Kenyan number'),
            setDefault: z.boolean().optional()
          }).safeParse({
            phoneNumber: mpesaPhone,
            setDefault: saveAsDefault
          });
          
          if (!mpesaValidation.success) {
            throw new Error(mpesaValidation.error.errors[0].message);
          }
          
          payload = {
            type: 'MPESA',
            mpesa: mpesaValidation.data
          };
          break;
          
        case 'paypal':
          // Validate PayPal email
          const paypalValidation = z.object({
            email: z.string().email('Invalid PayPal email address'),
            setDefault: z.boolean().optional()
          }).safeParse({
            email: paypalEmail,
            setDefault: saveAsDefault
          });
          
          if (!paypalValidation.success) {
            throw new Error(paypalValidation.error.errors[0].message);
          }
          
          payload = {
            type: 'PAYPAL',
            paypal: paypalValidation.data
          };
          break;
          
        case 'flutterwave':
          // Validate form data (similar to card)
          const flwValidation = z.object({
            number: z.string().regex(/^\d{16}$/, 'Card number must be 16 digits'),
            expMonth: z.number().int().min(1).max(12, 'Month must be between 1-12'),
            expYear: z.number().int().min(new Date().getFullYear() % 100, 'Year cannot be in the past'),
            cvc: z.string().regex(/^\d{3,4}$/, 'CVC must be 3-4 digits'),
            setDefault: z.boolean().optional()
          }).safeParse({
            number: cardNumber,
            expMonth: parseInt(cardExpMonth),
            expYear: parseInt(cardExpYear),
            cvc: cardCvc,
            setDefault: saveAsDefault
          });
          
          if (!flwValidation.success) {
            throw new Error(flwValidation.error.errors[0].message);
          }
          
          payload = {
            type: 'FLUTTERWAVE',
            flutterwave: flwValidation.data
          };
          break;
          
        case 'bank':
          // Validate bank transfer details
          const bankValidation = z.object({
            bankName: z.string().min(2, 'Bank name is required'),
            accountName: z.string().min(2, 'Account name is required'),
            accountNumber: z.string().min(5, 'Account number is required'),
            branchCode: z.string().optional(),
            setDefault: z.boolean().optional()
          }).safeParse({
            bankName,
            accountName,
            accountNumber,
            branchCode,
            setDefault: saveAsDefault
          });
          
          if (!bankValidation.success) {
            throw new Error(bankValidation.error.errors[0].message);
          }
          
          payload = {
            type: 'BANK_TRANSFER',
            bankTransfer: bankValidation.data
          };
          break;
          
        default:
          throw new Error('Invalid payment method type');
      }
      
      // Submit to API
      const response = await axios.post('/api/advertiser/payment-methods', payload);
      
      // Reset form and close dialog
      resetPaymentForms();
      setIsDialogOpen(false);
      
      // Refresh payment methods
      fetchBillingData();
      
      toast.success('Payment method added successfully!');
    } catch (error) {
      console.error('Error adding payment method:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add payment method');
    } finally {
      setIsAddingCard(false);
    }
  };
  
  // Reset all payment form fields
  const resetPaymentForms = () => {
    // Card fields
    setCardNumber('');
    setCardExpMonth('');
    setCardExpYear('');
    setCardCvc('');
    
    // M-Pesa fields
    setMpesaPhone('');
    
    // PayPal fields
    setPaypalEmail('');
    
    // Bank fields
    setBankName('');
    setAccountName('');
    setAccountNumber('');
    setBranchCode('');
    
    // Common fields
    setSaveAsDefault(false);
    setActiveTab('card');
  };
  
  // Handle adding funds to account
  const handleAddFunds = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsAddingFunds(true);
      
      // Validate amount
      const amountValidation = paymentSchema.safeParse({
        amount: parseFloat(amount)
      });
      
      if (!amountValidation.success) {
        throw new Error(amountValidation.error.errors[0].message);
      }
      
      // Check if payment method is selected
      if (!activePaymentMethod) {
        throw new Error('Please select a payment method');
      }
      
      // Submit to API
      const response = await axios.post('/api/advertiser/add-funds', {
        amount: parseFloat(amount),
        paymentMethodId: activePaymentMethod
      });
      
      // Reset form and close dialog
      setAmount('500');
      
      // Refresh billing data
      fetchBillingData();
      
      toast.success('Funds added successfully!');
    } catch (error) {
      console.error('Error adding funds:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add funds');
    } finally {
      setIsAddingFunds(false);
    }
  };
  
  // Handle setting a payment method as default
  const handleSetDefaultPaymentMethod = async (id: string) => {
    try {
      await axios.patch(`/api/advertiser/payment-methods/${id}/default`);
      await fetchBillingData();
      toast.success('Default payment method updated');
    } catch (error) {
      console.error('Error setting default payment method:', error);
      toast.error('Failed to update default payment method');
    }
  };
  
  // Handle deleting a payment method
  const handleDeletePaymentMethod = async (id: string) => {
    try {
      await axios.delete(`/api/advertiser/payment-methods/${id}`);
      await fetchBillingData();
      toast.success('Payment method deleted');
    } catch (error) {
      console.error('Error deleting payment method:', error);
      toast.error('Failed to delete payment method');
    }
  };
  
  // Format payment method type for display
  const formatCardType = (type: PaymentMethodType) => {
    return type.replace('_', ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
  };
  
  // Get display name for a payment method
  const getPaymentMethodDisplayName = (method: {
    type: PaymentMethodType;
    last4: string;
    expMonth?: number;
    expYear?: number;
    mpesaPhone?: string;
    paypalEmail?: string;
    bankName?: string;
    accountName?: string;
    cardBrand?: string;
  }) => {
    switch (method.type) {
      case 'VISA':
      case 'MASTERCARD':
      case 'AMEX':
        return `${method.cardBrand || method.type} •••• ${method.last4}${method.expMonth && method.expYear ? ` (${method.expMonth}/${method.expYear})` : ''}`;
      case 'MPESA':
        return `M-Pesa (${method.mpesaPhone || 'Unknown phone'})`;
      case 'PAYPAL':
        return `PayPal (${method.paypalEmail || 'Unknown email'})`;
      case 'BANK_TRANSFER':
        return `${method.bankName || 'Bank'} (${method.accountName || 'Unknown account'})`;
      case 'FLUTTERWAVE':
        return `Flutterwave •••• ${method.last4}`;
      default:
        return `${formatCardType(method.type)} (${method.last4 || 'Unknown'})`;
    }
  };
  
  // Get icon for payment method type
  const getPaymentMethodIcon = (type: PaymentMethodType) => {
    switch (type) {
      case 'VISA':
      case 'MASTERCARD':
      case 'AMEX':
        return <CreditCard className="h-4 w-4" />;
      case 'MPESA':
        return <Phone className="h-4 w-4" />;
      case 'PAYPAL':
        return <Globe className="h-4 w-4" />;
      case 'BANK_TRANSFER':
        return <Building className="h-4 w-4" />;
      case 'FLUTTERWAVE':
        return <Wallet className="h-4 w-4" />;
      default:
        return <CreditCard className="h-4 w-4" />;
    }
  };

  // Format currency based on system settings
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(generalSettings?.defaultLanguage || 'en-US', {
      style: 'currency',
      currency: generalSettings?.defaultCurrency || 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };
  
  // Check if a payment method is supported based on system settings
  const isPaymentMethodSupported = (methodType: string): boolean => {
    if (!paymentGateway?.supportedCurrencies) return true; // Default to true if settings not loaded
    
    switch (methodType.toLowerCase()) {
      case 'mpesa':
        return paymentGateway.supportedCurrencies.includes('KES');
      case 'paypal':
        return paymentGateway.provider === 'PayPal' || paymentGateway.provider === 'Multiple';
      case 'card':
        return true; // Cards are generally supported
      case 'flutterwave':
        return paymentGateway.provider === 'Flutterwave' || paymentGateway.provider === 'Multiple';
      case 'bank':
        return true; // Bank transfers are generally supported
      default:
        return true;
    }
  };

  if (isLoading) {
    return <LoadingState message="Loading billing information..." />;
  }

  // Rest of the component rendering
  // ...
} 