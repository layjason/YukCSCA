import type {
  Product,
  PaymentMethod,
  LinkedStudent,
  PendingStudent,
  StudentInvitation,
  WeeklyReport,
  WeeklyActivity,
  PreviewOrder,
  Entitlement,
  Receipt,
  RefundRequest,
  SupportTicket,
} from '../models/types';

export const sampleProducts: Product[] = [
  {
    id: 'math-english',
    name: 'Mathematics (English) Plan',
    subject: 'Mathematics',
    examLanguage: 'English',
    intendedLearner: 'Indonesian high-school students preparing for CSCA Mathematics in English',
    includedModules: [
      { name: 'Algebra and Functions', covered: true },
      { name: 'Geometry and Measurement', covered: true },
      { name: 'Statistics and Probability', covered: true },
      { name: 'Calculus Introduction', covered: false },
      { name: 'Trigonometry', covered: true },
    ],
    missingModules: ['Calculus Introduction'],
    practiceScope: '120+ practice questions across covered modules',
    terminologySupport: 'English mathematical terms with Indonesian explanations',
    aiAllowance: 'Bounded explanation assistance during learning; disabled during mock exams',
    mockAllowance: '2 full-length mock exams per validity period',
    tutoringEntitlement: null,
    validityDays: 90,
    priceIDR: 249000,
    renewalBehavior: 'Manual one-time renewal; no automatic billing',
    trialBenefits: ['1 sample lesson per module', '5 practice questions', '1 short diagnostic'],
    trialLimits: ['No mock exam access', 'No progress tracking', 'No AI explanation help'],
  },
  {
    id: 'math-chinese',
    name: 'Mathematics (Chinese) Plan',
    subject: 'Mathematics',
    examLanguage: 'Chinese',
    intendedLearner: 'Indonesian high-school students preparing for CSCA Mathematics in Chinese',
    includedModules: [
      { name: '代数与函数 (Algebra and Functions)', covered: true },
      { name: '几何与测量 (Geometry and Measurement)', covered: true },
      { name: '统计与概率 (Statistics and Probability)', covered: true },
      { name: '微积分入门 (Calculus Introduction)', covered: false },
      { name: '三角学 (Trigonometry)', covered: true },
    ],
    missingModules: ['微积分入门 (Calculus Introduction)'],
    practiceScope: '100+ practice questions with Chinese terminology support',
    terminologySupport:
      'Chinese mathematical terms with pinyin, Indonesian, and English explanations',
    aiAllowance: 'Bounded explanation and terminology assistance; disabled during mock exams',
    mockAllowance: '2 full-length mock exams per validity period',
    tutoringEntitlement: null,
    validityDays: 90,
    priceIDR: 279000,
    renewalBehavior: 'Manual one-time renewal; no automatic billing',
    trialBenefits: ['1 sample lesson per module', '5 practice questions', 'Terminology preview'],
    trialLimits: ['No mock exam access', 'No progress tracking', 'Limited AI terminology help'],
  },
];

export const samplePaymentMethods: PaymentMethod[] = [
  {
    id: 'qris',
    name: 'QRIS',
    available: true,
    instructions: 'Scan the QR code with any QRIS-enabled app (GoPay, OVO, Dana, bank app).',
  },
  {
    id: 'bankVa',
    name: 'Bank Virtual Account',
    available: true,
    instructions:
      'Transfer to the virtual account number shown below via ATM, mobile banking, or teller.',
  },
  {
    id: 'gopay',
    name: 'GoPay',
    available: false,
    instructions: 'GoPay is represented but unavailable in this non-live preview.',
  },
  {
    id: 'shopeepay',
    name: 'ShopeePay',
    available: false,
    instructions: 'ShopeePay integration is not available in this preview.',
  },
  {
    id: 'card',
    name: 'Payment Card',
    available: false,
    instructions: 'Card payments are not available in this preview.',
  },
];

export const sampleLinkedStudent: LinkedStudent = {
  id: 'student-fixture-01',
  name: 'Rina Kusuma',
  examLanguage: 'English',
  subject: 'Mathematics',
  linkStatus: 'active',
  linkedAt: '2026-07-01T08:00:00Z',
};

export const samplePendingStudent: PendingStudent = {
  id: 'pending-fixture-01',
  name: 'Andi Pratama',
  email: 'andi.sample@example.test',
  createdAt: '2026-07-20T10:00:00Z',
  status: 'pendingActivation',
};

export const sampleValidInvitation: StudentInvitation = {
  id: 'inv-fixture-01',
  studentName: 'Rina Kusuma',
  studentEmail: 'rina.sample@example.test',
  status: 'valid',
  allowedAccess: [
    'Weekly activity summary',
    'Syllabus progress',
    'Plan risk',
    'Access and service summary',
  ],
  expiresAt: '2026-08-01T00:00:00Z',
};

export const sampleExpiredInvitation: StudentInvitation = {
  id: 'inv-fixture-02',
  studentName: 'Budi Santoso',
  studentEmail: 'budi.sample@example.test',
  status: 'expired',
  allowedAccess: ['Weekly activity summary'],
  expiresAt: '2026-07-10T00:00:00Z',
};

export const sampleWeeklyActivity: WeeklyActivity = {
  tasksCompleted: 8,
  totalTasks: 12,
  studyMinutes: 185,
  syllabusProgress: 34,
  planFeasibility: 'onTrack',
  currentRisk: null,
};

export const sampleWeeklyActivityAtRisk: WeeklyActivity = {
  tasksCompleted: 3,
  totalTasks: 12,
  studyMinutes: 65,
  syllabusProgress: 22,
  planFeasibility: 'atRisk',
  currentRisk:
    'Plan delay: 3 consecutive days without activity. Current pace may not cover required topics before the exam date.',
};

export const sampleWeeklyReports: WeeklyReport[] = [
  {
    id: 'report-w3',
    weekLabel: 'Week 3 (15–21 Jul)',
    status: 'available',
    summary:
      'Rina completed 8 of 12 planned tasks, progressed through Algebra module 3, and maintained a steady study rhythm. No significant risk identified.',
    tasksCompleted: 8,
    totalTasks: 12,
    topicsProgressed: ['Algebra: Quadratic equations', 'Geometry: Triangle congruence'],
    riskLevel: 'none',
    recommendedActions: ['Continue current pace', 'Review trigonometry terms before next mock'],
  },
  {
    id: 'report-w2',
    weekLabel: 'Week 2 (8–14 Jul)',
    status: 'insufficientEvidence',
    summary: 'Insufficient activity to generate a meaningful report for this week.',
    tasksCompleted: 1,
    totalTasks: 10,
    topicsProgressed: [],
    riskLevel: 'low',
    recommendedActions: ['Encourage the student to resume their plan'],
  },
  {
    id: 'report-w1',
    weekLabel: 'Week 1 (1–7 Jul)',
    status: 'deliveryFailed',
    summary:
      'Weekly report was generated but email delivery failed. The report remains available here.',
    tasksCompleted: 6,
    totalTasks: 10,
    topicsProgressed: ['Algebra: Linear equations', 'Statistics: Mean and median'],
    riskLevel: 'none',
    recommendedActions: ['Verify contact information for future delivery'],
  },
];

export function createSampleOrder(overrides?: Partial<PreviewOrder>): PreviewOrder {
  return {
    id: 'ORD-PX2-001',
    productId: 'math-english',
    productName: 'Mathematics (English) Plan',
    subject: 'Mathematics',
    examLanguage: 'English',
    payerName: 'Dewi Kusuma',
    recipientId: 'student-fixture-01',
    recipientName: 'Rina Kusuma',
    amountIDR: 249000,
    validityDays: 90,
    paymentMethod: 'qris',
    status: 'pending',
    createdAt: '2026-07-24T09:00:00Z',
    expiresAt: '2026-07-24T21:00:00Z',
    providerReference: 'SAMPLE-QRIS-REF-001',
    reconciliationTime: null,
    ...overrides,
  };
}

export function createSampleEntitlement(overrides?: Partial<Entitlement>): Entitlement {
  return {
    id: 'ENT-PX2-001',
    productId: 'math-english',
    productName: 'Mathematics (English) Plan',
    subject: 'Mathematics',
    examLanguage: 'English',
    recipientId: 'student-fixture-01',
    recipientName: 'Rina Kusuma',
    startDate: '2026-07-24T09:30:00Z',
    expiryDate: '2026-10-22T09:30:00Z',
    status: 'active',
    usageLimits: '2 mock exams remaining; unlimited practice within covered modules',
    sourceOrderId: 'ORD-PX2-001',
    ...overrides,
  };
}

export function createSampleReceipt(order: PreviewOrder): Receipt {
  return {
    orderId: order.id,
    receiptNumber: `RCPT-${order.id.replace(/^ORD-/, '')}`,
    productName: order.productName,
    payerName: order.payerName,
    recipientName: order.recipientName,
    amountIDR: order.amountIDR,
    paymentMethod: order.paymentMethod,
    issuedAt: order.reconciliationTime ?? '2026-07-24T09:30:00Z',
  };
}

export const sampleRefundEligible: RefundRequest = {
  id: 'REF-PX2-001',
  orderId: 'ORD-PX2-001',
  reason: 'Duplicate payment',
  status: 'pendingReview',
  submittedAt: '2026-07-24T11:00:00Z',
  effectOnAccess: 'If approved, the associated entitlement will be revoked.',
};

export const sampleSupportTicket: SupportTicket = {
  id: 'TKT-PX2-001',
  category: 'payment',
  description: 'I was charged twice for the same order. Please review.',
  contextLink: 'Order ORD-PX2-001',
  status: 'open',
  createdAt: '2026-07-24T11:30:00Z',
  replies: [],
};
