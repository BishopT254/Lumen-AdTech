import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting wallet data seeding...');

  // Get existing partners
  const partners = await prisma.partner.findMany();
  
  if (partners.length === 0) {
    console.log('No partners found. Please run the main seed file first.');
    return;
  }

  console.log(`Found ${partners.length} partners. Creating wallet data...`);

  // Create wallets for partners
  const wallets = await createWallets(partners);
  
  // Create payment methods for wallets
  const paymentMethods = await createPaymentMethods(wallets);
  
  // Create transactions for wallets
  await createTransactions(wallets, paymentMethods);

  console.log('Wallet data seeding completed successfully!');
}

async function createWallets(partners) {
  console.log('Creating wallets...');
  
  const wallets = [];
  const currencies = ['USD', 'KES', 'EUR'];
  const walletStatuses = ['ACTIVE', 'ACTIVE', 'ACTIVE', 'SUSPENDED', 'LOCKED']; // Mostly active
  
  for (const partner of partners) {
    // Check if wallet already exists for this partner
    const existingWallet = await prisma.wallet.findUnique({
      where: { partnerId: partner.id }
    });
    
    if (existingWallet) {
      console.log(`Wallet already exists for partner ${partner.id}. Skipping.`);
      wallets.push(existingWallet);
      continue;
    }
    
    // Random values for wallet
    const balance = parseFloat((1000 + Math.random() * 9000).toFixed(2));
    const pendingBalance = parseFloat((100 + Math.random() * 900).toFixed(2));
    const currency = currencies[Math.floor(Math.random() * currencies.length)];
    const walletStatus = walletStatuses[Math.floor(Math.random() * walletStatuses.length)];
    const autoPayoutEnabled = Math.random() > 0.5;
    const payoutThreshold = parseFloat((100 + Math.random() * 400).toFixed(2));
    
    // Calculate next payout date for some wallets
    let nextPayoutDate = null;
    if (autoPayoutEnabled && walletStatus === 'ACTIVE') {
      nextPayoutDate = new Date();
      nextPayoutDate.setDate(1); // First day of month
      nextPayoutDate.setMonth(nextPayoutDate.getMonth() + 1); // Next month
    }
    
    const wallet = await prisma.wallet.create({
      data: {
        partnerId: partner.id,
        balance,
        pendingBalance,
        currency,
        walletStatus,
        autoPayoutEnabled,
        payoutThreshold,
        nextPayoutDate
      }
    });
    
    wallets.push(wallet);
  }
  
  console.log(`Created ${wallets.length} wallets`);
  return wallets;
}

async function createPaymentMethods(wallets) {
  console.log('Creating payment methods for wallets...');
  
  const paymentMethods = [];
  const paymentTypes = ['BANK_TRANSFER', 'MPESA', 'FLUTTERWAVE', 'PAYPAL', 'STRIPE'];
  
  for (const wallet of wallets) {
    // Skip wallets with LOCKED status
    if (wallet.walletStatus === 'LOCKED') {
      continue;
    }
    
    // Create 1-3 payment methods per wallet
    const numMethods = 1 + Math.floor(Math.random() * 3);
    
    for (let i = 0; i < numMethods; i++) {
      const paymentType = paymentTypes[Math.floor(Math.random() * paymentTypes.length)];
      const isDefault = i === 0; // First one is default
      const isVerified = Math.random() > 0.2; // 80% chance of being verified
      const lastUsed = Math.random() > 0.5 ? new Date() : null;
      
      // Create payment method details based on type
      let details = {};
      
      switch (paymentType) {
        case 'BANK_TRANSFER':
          details = {
            bankName: ['Kenya Commercial Bank', 'Equity Bank', 'Standard Chartered', 'Barclays'][Math.floor(Math.random() * 4)],
            accountNumber: `${Math.floor(Math.random() * 10000000000)}`,
            accountName: `Account ${Math.floor(Math.random() * 1000)}`,
            branchCode: `${Math.floor(Math.random() * 1000)}`,
            swiftCode: ['KCBLKENX', 'EQBLKENA', 'SCBLKENX'][Math.floor(Math.random() * 3)]
          };
          break;
        case 'MPESA':
          details = {
            phoneNumber: `+254${700000000 + Math.floor(Math.random() * 99999999)}`,
            accountName: `M-PESA ${Math.floor(Math.random() * 1000)}`
          };
          break;
        case 'PAYPAL':
          details = {
            email: `user${Math.floor(Math.random() * 1000)}@example.com`,
            accountId: `PP${Math.floor(Math.random() * 10000000)}`
          };
          break;
        case 'STRIPE':
        case 'FLUTTERWAVE':
          details = {
            accountId: `ACCT_${Math.floor(Math.random() * 1000000)}`,
            customerId: `CUST_${Math.floor(Math.random() * 1000000)}`
          };
          break;
      }
      
      const paymentMethod = await prisma.paymentMethod.create({
        data: {
          walletId: wallet.id,
          type: paymentType,
          details,
          isDefault,
          isVerified,
          lastUsed,
          status: isVerified ? 'ACTIVE' : 'UNVERIFIED'
        }
      });
      
      paymentMethods.push(paymentMethod);
    }
  }
  
  console.log(`Created ${paymentMethods.length} payment methods`);
  return paymentMethods;
}

async function createTransactions(wallets, paymentMethods) {
  console.log('Creating transactions...');
  
  const transactionTypes = ['DEPOSIT', 'WITHDRAWAL', 'PAYMENT', 'REFUND', 'ADJUSTMENT'];
  const transactionStatuses = ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'];
  
  let totalTransactions = 0;
  
  for (const wallet of wallets) {
    // Skip creating transactions for LOCKED wallets
    if (wallet.walletStatus === 'LOCKED') {
      continue;
    }
    
    // Find payment methods for this wallet
    const walletPaymentMethods = paymentMethods.filter(pm => pm.walletId === wallet.id);
    
    // Create 5-15 transactions per wallet
    const numTransactions = 5 + Math.floor(Math.random() * 11);
    
    for (let i = 0; i < numTransactions; i++) {
      const type = transactionTypes[Math.floor(Math.random() * transactionTypes.length)];
      const status = transactionStatuses[Math.floor(Math.random() * transactionStatuses.length)];
      
      // Amount based on transaction type
      let amount;
      switch (type) {
        case 'DEPOSIT':
          amount = parseFloat((100 + Math.random() * 900).toFixed(2));
          break;
        case 'WITHDRAWAL':
          amount = parseFloat((50 + Math.random() * 500).toFixed(2));
          break;
        case 'PAYMENT':
          amount = parseFloat((200 + Math.random() * 800).toFixed(2));
          break;
        case 'REFUND':
          amount = parseFloat((50 + Math.random() * 200).toFixed(2));
          break;
        case 'ADJUSTMENT':
          amount = parseFloat((10 + Math.random() * 100).toFixed(2));
          break;
      }
      
      // Transaction date (within last 90 days)
      const date = new Date();
      date.setDate(date.getDate() - Math.floor(Math.random() * 90));
      
      // Processed date for completed transactions
      let processedAt = null;
      if (status === 'COMPLETED') {
        processedAt = new Date(date);
        processedAt.setHours(processedAt.getHours() + Math.floor(Math.random() * 48)); // 0-48 hours later
      }
      
      // Reference number
      const reference = `TXN-${wallet.id.substring(0, 4)}-${Date.now()}-${i}`;
      
      // Description based on transaction type
      let description;
      switch (type) {
        case 'DEPOSIT':
          description = 'Funds deposit to wallet';
          break;
        case 'WITHDRAWAL':
          description = 'Withdrawal from wallet';
          break;
        case 'PAYMENT':
          description = 'Payment for services';
          break;
        case 'REFUND':
          description = 'Refund for cancelled service';
          break;
        case 'ADJUSTMENT':
          description = 'Account adjustment';
          break;
      }
      
      // Metadata based on transaction type
      let metadata = {};
      switch (type) {
        case 'DEPOSIT':
          metadata = {
            source: ['bank_transfer', 'mobile_money', 'card_payment'][Math.floor(Math.random() * 3)],
            notes: 'Regular deposit'
          };
          break;
        case 'WITHDRAWAL':
          metadata = {
            destination: ['bank_account', 'mobile_wallet'][Math.floor(Math.random() * 2)],
            fee: parseFloat((amount * 0.01).toFixed(2))
          };
          break;
        case 'PAYMENT':
          metadata = {
            serviceId: `SRV-${Math.floor(Math.random() * 1000)}`,
            invoiceNumber: `INV-${Math.floor(Math.random() * 10000)}`
          };
          break;
        case 'REFUND':
          metadata = {
            originalTransactionId: `TXN-${Math.floor(Math.random() * 10000)}`,
            reason: ['service_cancelled', 'duplicate_payment', 'customer_request'][Math.floor(Math.random() * 3)]
          };
          break;
        case 'ADJUSTMENT':
          metadata = {
            reason: ['account_correction', 'bonus', 'fee_adjustment'][Math.floor(Math.random() * 3)],
            approvedBy: `USER-${Math.floor(Math.random() * 100)}`
          };
          break;
      }
      
      // Randomly assign a payment method for relevant transaction types
      let paymentMethodId = null;
      if (['DEPOSIT', 'WITHDRAWAL', 'PAYMENT'].includes(type) && walletPaymentMethods.length > 0) {
        const paymentMethod = walletPaymentMethods[Math.floor(Math.random() * walletPaymentMethods.length)];
        paymentMethodId = paymentMethod.id;
      }
      
      await prisma.transaction.create({
        data: {
          walletId: wallet.id,
          type,
          amount,
          currency: wallet.currency,
          status,
          description,
          reference,
          paymentMethodId,
          date,
          processedAt,
          metadata
        }
      });
      
      totalTransactions++;
    }
  }
  
  console.log(`Created ${totalTransactions} transactions`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });