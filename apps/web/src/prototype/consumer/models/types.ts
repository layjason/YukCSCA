export type PreviewCredentialStatus =
  'absent' | 'registering' | 'verificationPending' | 'active' | 'expired';

export type RoleIntent = 'none' | 'student' | 'parent';

export interface PreviewCredentialSession {
  status: PreviewCredentialStatus;
  previewSessionId: string;
  displayEmail: string;
  roleIntent: RoleIntent;
}

export type ParentOnboardingStep = 'profile' | 'privacy' | 'complete';

export type FamilyLinkStatus =
  | 'noLink'
  | 'pendingStudent'
  | 'pendingInvitation'
  | 'active'
  | 'expired'
  | 'mismatched'
  | 'alreadyUsed'
  | 'unlinkReview'
  | 'unlinked';

export interface ParentProfile {
  name: string;
  relationship: string;
  contactEmail: string;
  preferredContact: 'email' | 'phone';
  locale: string;
  essentialNotifications: boolean;
  learningReminders: boolean;
  weeklyReport: boolean;
  riskAlerts: boolean;
  marketingOptIn: boolean;
  termsAccepted: boolean;
}

export interface LinkedStudent {
  id: string;
  name: string;
  examLanguage: string;
  subject: string;
  linkStatus: 'active' | 'pending';
  linkedAt: string;
}

export interface PendingStudent {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  status: 'pendingActivation';
}

export interface StudentInvitation {
  id: string;
  studentName: string;
  studentEmail: string;
  status: 'valid' | 'expired' | 'mismatched' | 'alreadyUsed';
  allowedAccess: string[];
  expiresAt: string;
}

export interface WeeklyActivity {
  tasksCompleted: number;
  totalTasks: number;
  studyMinutes: number;
  syllabusProgress: number;
  planFeasibility: 'onTrack' | 'atRisk' | 'highRisk';
  currentRisk: string | null;
}

export interface WeeklyReport {
  id: string;
  weekLabel: string;
  status: 'available' | 'insufficientEvidence' | 'deliveryFailed';
  summary: string;
  tasksCompleted: number;
  totalTasks: number;
  topicsProgressed: string[];
  riskLevel: 'none' | 'low' | 'medium' | 'high';
  recommendedActions: string[];
}

export type ProductExamLanguage = 'English' | 'Chinese';

export interface ProductModule {
  name: string;
  covered: boolean;
}

export interface Product {
  id: string;
  name: string;
  subject: string;
  examLanguage: ProductExamLanguage;
  intendedLearner: string;
  includedModules: ProductModule[];
  missingModules: string[];
  practiceScope: string;
  terminologySupport: string;
  aiAllowance: string;
  mockAllowance: string;
  tutoringEntitlement: string | null;
  validityDays: number;
  priceIDR: number;
  renewalBehavior: string;
  trialBenefits: string[];
  trialLimits: string[];
}

export type PaymentMethodId = 'qris' | 'bankVa' | 'gopay' | 'shopeepay' | 'card';

export interface PaymentMethod {
  id: PaymentMethodId;
  name: string;
  available: boolean;
  instructions: string;
}

export type OrderStatus = 'pending' | 'paid' | 'failed' | 'expired' | 'cancelled' | 'refunded';

export interface PreviewOrder {
  id: string;
  productId: string;
  productName: string;
  subject: string;
  examLanguage: string;
  payerName: string;
  recipientId: string;
  recipientName: string;
  amountIDR: number;
  validityDays: number;
  paymentMethod: PaymentMethodId;
  status: OrderStatus;
  createdAt: string;
  expiresAt: string;
  providerReference: string;
  reconciliationTime: string | null;
}

export interface Receipt {
  orderId: string;
  receiptNumber: string;
  productName: string;
  payerName: string;
  recipientName: string;
  amountIDR: number;
  paymentMethod: string;
  issuedAt: string;
}

export type EntitlementStatus = 'active' | 'expiring' | 'expired' | 'pendingReconciliation';

export interface Entitlement {
  id: string;
  productId: string;
  productName: string;
  subject: string;
  examLanguage: string;
  recipientId: string;
  recipientName: string;
  startDate: string;
  expiryDate: string;
  status: EntitlementStatus;
  usageLimits: string;
  sourceOrderId: string;
}

export type RefundStatus = 'pendingReview' | 'approved' | 'rejected' | 'resolved';

export interface RefundRequest {
  id: string;
  orderId: string;
  reason: string;
  status: RefundStatus;
  submittedAt: string;
  effectOnAccess: string;
}

export type SupportCategory = 'account' | 'payment' | 'content' | 'aiAnswer' | 'tutoring';

export type SupportTicketStatus = 'open' | 'inProgress' | 'resolved' | 'closed';

export interface SupportTicket {
  id: string;
  category: SupportCategory;
  description: string;
  contextLink: string;
  status: SupportTicketStatus;
  createdAt: string;
  replies: { from: 'user' | 'support'; message: string; at: string }[];
}

export interface NotificationPreferences {
  inApp: boolean;
  email: boolean;
  learningReminders: boolean;
  weeklyParentReport: boolean;
  riskAlerts: boolean;
  entitlementExpiry: boolean;
  orderPaymentStatus: boolean;
  supportUpdates: boolean;
  marketing: boolean;
}

export type CommerceStep = 'review' | 'payment' | 'instructions' | 'result';
