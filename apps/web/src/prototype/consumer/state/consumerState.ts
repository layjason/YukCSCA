import type {
  PreviewCredentialSession,
  ParentProfile,
  ParentOnboardingStep,
  FamilyLinkStatus,
  LinkedStudent,
  PendingStudent,
  StudentInvitation,
  PreviewOrder,
  Entitlement,
  RefundRequest,
  SupportTicket,
  NotificationPreferences,
  CommerceStep,
  OrderStatus,
  PaymentMethodId,
} from '../models/types';

export interface ConsumerState {
  credentialSession: PreviewCredentialSession;
  parentOnboardingStep: ParentOnboardingStep | null;
  parentProfile: ParentProfile | null;
  familyLinkStatus: FamilyLinkStatus;
  linkedStudent: LinkedStudent | null;
  pendingStudent: PendingStudent | null;
  invitation: StudentInvitation | null;
  orders: PreviewOrder[];
  entitlements: Entitlement[];
  refundRequests: RefundRequest[];
  supportTickets: SupportTicket[];
  notificationPrefs: NotificationPreferences;
  commerceStep: CommerceStep;
  activeOrderId: string | null;
  selectedProductId: string | null;
  selectedRecipientId: string | null;
  selectedPaymentMethod: PaymentMethodId | null;
  previewStateLost: boolean;
}

export type ConsumerAction =
  | { type: 'CREDENTIAL_REGISTER_START'; email: string }
  | { type: 'CREDENTIAL_VERIFICATION_PENDING'; email: string }
  | { type: 'CREDENTIAL_VERIFIED'; email: string }
  | { type: 'CREDENTIAL_LOGIN_SUCCESS'; email: string }
  | { type: 'CREDENTIAL_EXPIRED' }
  | { type: 'CREDENTIAL_RESET' }
  | { type: 'SET_ROLE_INTENT'; intent: 'student' | 'parent' }
  | { type: 'PARENT_ONBOARDING_STEP'; step: ParentOnboardingStep }
  | { type: 'PARENT_PROFILE_COMPLETE'; profile: ParentProfile }
  | { type: 'FAMILY_CREATE_STUDENT'; student: PendingStudent }
  | { type: 'FAMILY_ACCEPT_INVITATION'; student: LinkedStudent }
  | { type: 'FAMILY_SET_INVITATION'; invitation: StudentInvitation }
  | { type: 'FAMILY_UNLINK_REVIEW' }
  | { type: 'FAMILY_UNLINK_CANCEL' }
  | { type: 'FAMILY_UNLINK_CONFIRM' }
  | { type: 'FAMILY_RESET' }
  | { type: 'COMMERCE_SELECT_PRODUCT'; productId: string | null }
  | { type: 'COMMERCE_SELECT_RECIPIENT'; recipientId: string }
  | { type: 'COMMERCE_SELECT_PAYMENT'; method: PaymentMethodId }
  | { type: 'COMMERCE_SET_STEP'; step: CommerceStep }
  | { type: 'COMMERCE_CREATE_ORDER'; order: PreviewOrder }
  | { type: 'COMMERCE_ORDER_OUTCOME'; orderId: string; status: OrderStatus }
  | { type: 'COMMERCE_GRANT_ENTITLEMENT'; entitlement: Entitlement }
  | { type: 'REFUND_SUBMIT'; request: RefundRequest }
  | { type: 'SUPPORT_SUBMIT'; ticket: SupportTicket }
  | { type: 'SUPPORT_REPLY'; ticketId: string; message: string }
  | { type: 'NOTIFICATION_PREFS_UPDATE'; prefs: Partial<NotificationPreferences> }
  | { type: 'PREVIEW_STATE_LOST' }
  | { type: 'PREVIEW_RESTART' };

export const initialConsumerState: ConsumerState = {
  credentialSession: {
    status: 'absent',
    previewSessionId: '',
    displayEmail: '',
    roleIntent: 'none',
  },
  parentOnboardingStep: null,
  parentProfile: null,
  familyLinkStatus: 'noLink',
  linkedStudent: null,
  pendingStudent: null,
  invitation: null,
  orders: [],
  entitlements: [],
  refundRequests: [],
  supportTickets: [],
  notificationPrefs: {
    inApp: true,
    email: true,
    learningReminders: true,
    weeklyParentReport: true,
    riskAlerts: true,
    entitlementExpiry: true,
    orderPaymentStatus: true,
    supportUpdates: true,
    marketing: false,
  },
  commerceStep: 'review',
  activeOrderId: null,
  selectedProductId: null,
  selectedRecipientId: null,
  selectedPaymentMethod: null,
  previewStateLost: false,
};

export function consumerReducer(state: ConsumerState, action: ConsumerAction): ConsumerState {
  switch (action.type) {
    case 'CREDENTIAL_REGISTER_START':
      return {
        ...state,
        credentialSession: {
          ...state.credentialSession,
          status: 'registering',
          displayEmail: action.email,
        },
      };

    case 'CREDENTIAL_VERIFICATION_PENDING':
      return {
        ...state,
        credentialSession: {
          status: 'verificationPending',
          previewSessionId: `preview-${action.email.replace(/[^a-z0-9]/gi, '')}`,
          displayEmail: action.email,
          roleIntent: state.credentialSession.roleIntent,
        },
      };

    case 'CREDENTIAL_VERIFIED':
      return {
        ...state,
        credentialSession: {
          ...state.credentialSession,
          status: 'active',
          displayEmail: action.email,
        },
      };

    case 'CREDENTIAL_LOGIN_SUCCESS':
      return {
        ...state,
        credentialSession: {
          status: 'active',
          previewSessionId: `preview-${action.email.replace(/[^a-z0-9]/gi, '')}`,
          displayEmail: action.email,
          roleIntent: state.credentialSession.roleIntent,
        },
      };

    case 'CREDENTIAL_EXPIRED':
      return {
        ...state,
        credentialSession: { ...state.credentialSession, status: 'expired' },
      };

    case 'CREDENTIAL_RESET':
      return {
        ...state,
        credentialSession: {
          status: 'absent',
          previewSessionId: '',
          displayEmail: '',
          roleIntent: 'none',
        },
      };

    case 'SET_ROLE_INTENT':
      return {
        ...state,
        credentialSession: { ...state.credentialSession, roleIntent: action.intent },
      };

    case 'PARENT_ONBOARDING_STEP':
      return { ...state, parentOnboardingStep: action.step };

    case 'PARENT_PROFILE_COMPLETE':
      return {
        ...state,
        parentProfile: action.profile,
        parentOnboardingStep: 'complete',
      };

    case 'FAMILY_CREATE_STUDENT':
      return {
        ...state,
        pendingStudent: action.student,
        familyLinkStatus: 'pendingStudent',
      };

    case 'FAMILY_ACCEPT_INVITATION':
      return {
        ...state,
        linkedStudent: action.student,
        familyLinkStatus: 'active',
        invitation: null,
      };

    case 'FAMILY_SET_INVITATION':
      return { ...state, invitation: action.invitation };

    case 'FAMILY_UNLINK_REVIEW':
      return { ...state, familyLinkStatus: 'unlinkReview' };

    case 'FAMILY_UNLINK_CONFIRM':
      return {
        ...state,
        familyLinkStatus: 'unlinked',
        linkedStudent: null,
      };

    case 'FAMILY_UNLINK_CANCEL':
      return {
        ...state,
        familyLinkStatus: state.linkedStudent ? 'active' : 'noLink',
      };

    case 'FAMILY_RESET':
      return {
        ...state,
        familyLinkStatus: 'noLink',
        linkedStudent: null,
        pendingStudent: null,
        invitation: null,
      };

    case 'COMMERCE_SELECT_PRODUCT':
      return { ...state, selectedProductId: action.productId, commerceStep: 'review' };

    case 'COMMERCE_SELECT_RECIPIENT':
      return { ...state, selectedRecipientId: action.recipientId };

    case 'COMMERCE_SELECT_PAYMENT':
      return { ...state, selectedPaymentMethod: action.method };

    case 'COMMERCE_SET_STEP':
      return { ...state, commerceStep: action.step };

    case 'COMMERCE_CREATE_ORDER': {
      const existing = state.orders.find((order) => order.id === action.order.id);
      if (existing) {
        return { ...state, activeOrderId: existing.id, commerceStep: 'instructions' };
      }
      return {
        ...state,
        orders: [...state.orders, action.order],
        activeOrderId: action.order.id,
        commerceStep: 'instructions',
      };
    }

    case 'COMMERCE_ORDER_OUTCOME': {
      const orders = state.orders.map((o) =>
        o.id === action.orderId && o.status === 'pending'
          ? {
              ...o,
              status: action.status,
              reconciliationTime:
                action.status === 'paid' ? '2026-07-24T09:30:00Z' : o.reconciliationTime,
            }
          : o,
      );
      return { ...state, orders };
    }

    case 'COMMERCE_GRANT_ENTITLEMENT': {
      const paidSourceOrder = state.orders.find(
        (order) => order.id === action.entitlement.sourceOrderId && order.status === 'paid',
      );
      if (!paidSourceOrder) return state;
      const existing = state.entitlements.find(
        (e) => e.sourceOrderId === action.entitlement.sourceOrderId,
      );
      if (existing) return state;
      return { ...state, entitlements: [...state.entitlements, action.entitlement] };
    }

    case 'REFUND_SUBMIT':
      if (state.refundRequests.some((request) => request.orderId === action.request.orderId)) {
        return state;
      }
      return { ...state, refundRequests: [...state.refundRequests, action.request] };

    case 'SUPPORT_SUBMIT':
      if (state.supportTickets.some((ticket) => ticket.id === action.ticket.id)) {
        return state;
      }
      return { ...state, supportTickets: [...state.supportTickets, action.ticket] };

    case 'SUPPORT_REPLY':
      return {
        ...state,
        supportTickets: state.supportTickets.map((t) =>
          t.id === action.ticketId
            ? {
                ...t,
                replies: [
                  ...t.replies,
                  { from: 'user' as const, message: action.message, at: '2026-07-24T10:00:00Z' },
                ],
              }
            : t,
        ),
      };

    case 'NOTIFICATION_PREFS_UPDATE':
      return {
        ...state,
        notificationPrefs: { ...state.notificationPrefs, ...action.prefs },
      };

    case 'PREVIEW_STATE_LOST':
      return { ...initialConsumerState, previewStateLost: true };

    case 'PREVIEW_RESTART':
      return { ...initialConsumerState };

    default:
      return state;
  }
}
