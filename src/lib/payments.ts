import { PaymentProvider, Transaction, User } from '../types';
import { db } from './firebase';
import { doc, getDoc, updateDoc, setDoc, collection, addDoc, runTransaction } from 'firebase/firestore';

export const paymentProviders: Record<string, PaymentProvider> = {
  stripe: {
    name: 'Stripe',
    initializePayment: async (amount, currency, metadata) => {
      // Simulates Stripe API PaymentIntent creation
      const txId = 'ch_stripe_' + Math.random().toString(36).substring(2, 11);
      return { success: true, transactionId: txId, details: { gateway: 'stripe', processingFee: amount * 0.029 + 0.3 } };
    },
    processRefund: async (transactionId, amount) => {
      const refId = 're_stripe_' + Math.random().toString(36).substring(2, 11);
      return { success: true, refundId: refId };
    },
    withdrawFunds: async (userId, amount, destination) => {
      const payoutId = 'po_stripe_' + Math.random().toString(36).substring(2, 11);
      return { success: true, payoutId };
    }
  },
  paypal: {
    name: 'PayPal',
    initializePayment: async (amount, currency, metadata) => {
      // Simulates PayPal Orders API
      const txId = 'PAYID-' + Math.random().toString(36).substring(2, 15).toUpperCase();
      return { success: true, transactionId: txId, details: { gateway: 'paypal', processingFee: amount * 0.034 + 0.4 } };
    },
    processRefund: async (transactionId, amount) => {
      const refId = 'REF-' + Math.random().toString(36).substring(2, 15).toUpperCase();
      return { success: true, refundId: refId };
    },
    withdrawFunds: async (userId, amount, destination) => {
      const payoutId = 'PO-' + Math.random().toString(36).substring(2, 15).toUpperCase();
      return { success: true, payoutId };
    }
  },
  razorpay: {
    name: 'Razorpay',
    initializePayment: async (amount, currency, metadata) => {
      // Simulates Razorpay Orders API
      const txId = 'pay_rzp_' + Math.random().toString(36).substring(2, 14);
      return { success: true, transactionId: txId, details: { gateway: 'razorpay', processingFee: amount * 0.02 } };
    },
    processRefund: async (transactionId, amount) => {
      const refId = 'rfnd_rzp_' + Math.random().toString(36).substring(2, 14);
      return { success: true, refundId: refId };
    },
    withdrawFunds: async (userId, amount, destination) => {
      const payoutId = 'pout_rzp_' + Math.random().toString(36).substring(2, 14);
      return { success: true, payoutId };
    }
  }
};

// Subscription configurations containing prices and details for the subscription system
export interface PlanConfig {
  id: 'FREE' | 'PRO_FREELANCER' | 'AGENCY_PRO' | 'BUSINESS_PRO';
  name: string;
  priceMonthly: number;
  currency: string;
  aiCredits: number;
  features: string[];
}

export const SUBSCRIPTION_PLANS: Record<string, PlanConfig> = {
  FREE: {
    id: 'FREE',
    name: 'Free Starter',
    priceMonthly: 0,
    currency: 'USD',
    aiCredits: 5,
    features: ['Standard matching', '5 free AI proposals / month', 'Standard client messaging']
  },
  PRO_FREELANCER: {
    id: 'PRO_FREELANCER',
    name: 'Pro Freelancer',
    priceMonthly: 15,
    currency: 'USD',
    aiCredits: 100,
    features: ['Featured badge on profile', 'Unlimited AI proposals', 'Advanced stats dashboard', 'Priority support', '100 AI credits / month']
  },
  AGENCY_PRO: {
    id: 'AGENCY_PRO',
    name: 'Agency Pro',
    priceMonthly: 49,
    currency: 'USD',
    aiCredits: 500,
    features: ['Featured agency profile', 'Unlimited AI proposals', 'Team collaboration seats', 'Dedicated support agent', '500 AI credits / month', 'Agency branding']
  },
  BUSINESS_PRO: {
    id: 'BUSINESS_PRO',
    name: 'Business Pro',
    priceMonthly: 79,
    currency: 'USD',
    aiCredits: 1000,
    features: ['Featured jobs listed on top', 'Priority client match', 'Unlimited job matching feedback', 'Dedicated account manager', '1000 AI credits / month']
  }
};

// Firestore Error handling pattern
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: 'system'
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Transaction Helpers
export async function createPaymentRecord(transaction: Omit<Transaction, 'id' | 'createdAt'>) {
  const txId = 'TX-' + Date.now() + Math.random().toString(36).substring(2, 6).toUpperCase();
  const txData: Transaction = {
    ...transaction,
    id: txId,
    createdAt: new Date().toISOString(),
    invoiceNumber: 'INV-' + Date.now().toString().slice(-6) + '-' + Math.random().toString(36).substring(2, 5).toUpperCase()
  };
  
  try {
    await setDoc(doc(db, 'transactions', txId), txData);
    return txData;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `transactions/${txId}`);
    throw error;
  }
}
