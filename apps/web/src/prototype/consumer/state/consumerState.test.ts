import { describe, expect, test } from 'vitest';
import { consumerReducer, initialConsumerState } from './consumerState';
import type { ConsumerState } from './consumerState';
import { createSampleOrder, createSampleEntitlement, createSampleReceipt } from '../fixtures';

describe('consumerReducer', () => {
  test('credential registration transitions through verification to active', () => {
    let state = initialConsumerState;
    state = consumerReducer(state, {
      type: 'CREDENTIAL_REGISTER_START',
      email: 'test@example.test',
    });
    expect(state.credentialSession.status).toBe('registering');

    state = consumerReducer(state, {
      type: 'CREDENTIAL_VERIFICATION_PENDING',
      email: 'test@example.test',
    });
    expect(state.credentialSession.status).toBe('verificationPending');
    expect(state.credentialSession.previewSessionId).toContain('preview-');

    state = consumerReducer(state, { type: 'CREDENTIAL_VERIFIED', email: 'test@example.test' });
    expect(state.credentialSession.status).toBe('active');
  });

  test('credential login creates active session', () => {
    let state = initialConsumerState;
    state = consumerReducer(state, {
      type: 'CREDENTIAL_LOGIN_SUCCESS',
      email: 'user@example.test',
    });
    expect(state.credentialSession.status).toBe('active');
    expect(state.credentialSession.displayEmail).toBe('user@example.test');
  });

  test('role intent is recorded on credential session', () => {
    let state = initialConsumerState;
    state = consumerReducer(state, {
      type: 'CREDENTIAL_LOGIN_SUCCESS',
      email: 'user@example.test',
    });
    state = consumerReducer(state, { type: 'SET_ROLE_INTENT', intent: 'parent' });
    expect(state.credentialSession.roleIntent).toBe('parent');
  });

  test('parent onboarding completes with profile', () => {
    let state = initialConsumerState;
    state = consumerReducer(state, { type: 'PARENT_ONBOARDING_STEP', step: 'profile' });
    expect(state.parentOnboardingStep).toBe('profile');

    const profile = {
      name: 'Dewi',
      relationship: 'parent',
      contactEmail: 'dewi@example.test',
      preferredContact: 'email' as const,
      locale: 'id',
      essentialNotifications: true,
      learningReminders: true,
      weeklyReport: true,
      riskAlerts: true,
      marketingOptIn: false,
      termsAccepted: true,
    };
    state = consumerReducer(state, { type: 'PARENT_PROFILE_COMPLETE', profile });
    expect(state.parentProfile).toEqual(profile);
    expect(state.parentOnboardingStep).toBe('complete');
  });

  test('family link lifecycle: create pending, accept invitation, unlink', () => {
    let state = initialConsumerState;
    expect(state.familyLinkStatus).toBe('noLink');

    state = consumerReducer(state, {
      type: 'FAMILY_CREATE_STUDENT',
      student: {
        id: 'p1',
        name: 'Andi',
        email: 'andi@test.test',
        createdAt: '2026-07-20',
        status: 'pendingActivation',
      },
    });
    expect(state.familyLinkStatus).toBe('pendingStudent');

    state = consumerReducer(state, { type: 'FAMILY_RESET' });
    expect(state.familyLinkStatus).toBe('noLink');

    state = consumerReducer(state, {
      type: 'FAMILY_ACCEPT_INVITATION',
      student: {
        id: 's1',
        name: 'Rina',
        examLanguage: 'English',
        subject: 'Mathematics',
        linkStatus: 'active',
        linkedAt: '2026-07-01',
      },
    });
    expect(state.familyLinkStatus).toBe('active');
    expect(state.linkedStudent?.name).toBe('Rina');

    state = consumerReducer(state, { type: 'FAMILY_UNLINK_REVIEW' });
    expect(state.familyLinkStatus).toBe('unlinkReview');

    state = consumerReducer(state, { type: 'FAMILY_UNLINK_CANCEL' });
    expect(state.familyLinkStatus).toBe('active');
    expect(state.linkedStudent?.name).toBe('Rina');

    state = consumerReducer(state, { type: 'FAMILY_UNLINK_REVIEW' });
    state = consumerReducer(state, { type: 'FAMILY_UNLINK_CONFIRM' });
    expect(state.familyLinkStatus).toBe('unlinked');
    expect(state.linkedStudent).toBeNull();
  });

  test('duplicate order confirmation returns existing pending order (idempotency)', () => {
    let state = initialConsumerState;
    const order = createSampleOrder();

    state = consumerReducer(state, { type: 'COMMERCE_CREATE_ORDER', order });
    expect(state.orders).toHaveLength(1);
    expect(state.activeOrderId).toBe('ORD-PX2-001');

    state = consumerReducer(state, { type: 'COMMERCE_CREATE_ORDER', order });
    expect(state.orders).toHaveLength(1);
  });

  test('paid outcome grants exactly one entitlement (idempotency)', () => {
    let state = initialConsumerState;
    const order = createSampleOrder();
    state = consumerReducer(state, { type: 'COMMERCE_CREATE_ORDER', order });
    state = consumerReducer(state, {
      type: 'COMMERCE_ORDER_OUTCOME',
      orderId: 'ORD-PX2-001',
      status: 'paid',
    });

    const entitlement = createSampleEntitlement();
    state = consumerReducer(state, { type: 'COMMERCE_GRANT_ENTITLEMENT', entitlement });
    expect(state.entitlements).toHaveLength(1);

    state = consumerReducer(state, { type: 'COMMERCE_GRANT_ENTITLEMENT', entitlement });
    expect(state.entitlements).toHaveLength(1);

    state = consumerReducer(state, { type: 'COMMERCE_CREATE_ORDER', order });
    expect(state.orders).toHaveLength(1);
  });

  test('non-paid order cannot grant entitlement and terminal outcome cannot be reversed', () => {
    let state = initialConsumerState;
    const order = createSampleOrder();
    state = consumerReducer(state, { type: 'COMMERCE_CREATE_ORDER', order });
    state = consumerReducer(state, {
      type: 'COMMERCE_GRANT_ENTITLEMENT',
      entitlement: createSampleEntitlement(),
    });
    expect(state.entitlements).toHaveLength(0);

    state = consumerReducer(state, {
      type: 'COMMERCE_ORDER_OUTCOME',
      orderId: 'ORD-PX2-001',
      status: 'failed',
    });
    expect(state.orders[0]!.status).toBe('failed');

    state = consumerReducer(state, {
      type: 'COMMERCE_ORDER_OUTCOME',
      orderId: 'ORD-PX2-001',
      status: 'paid',
    });
    state = consumerReducer(state, {
      type: 'COMMERCE_GRANT_ENTITLEMENT',
      entitlement: createSampleEntitlement(),
    });
    expect(state.orders[0]!.status).toBe('failed');
    expect(state.entitlements).toHaveLength(0);
  });

  test('paid order sets reconciliationTime', () => {
    let state = initialConsumerState;
    const order = createSampleOrder();
    state = consumerReducer(state, { type: 'COMMERCE_CREATE_ORDER', order });
    expect(state.orders[0]!.reconciliationTime).toBeNull();

    state = consumerReducer(state, {
      type: 'COMMERCE_ORDER_OUTCOME',
      orderId: 'ORD-PX2-001',
      status: 'paid',
    });
    expect(state.orders[0]!.status).toBe('paid');
    expect(state.orders[0]!.reconciliationTime).toBe('2026-07-24T09:30:00Z');
  });

  test('sample receipt numbers remain unique per deterministic order', () => {
    const first = createSampleReceipt(
      createSampleOrder({ id: 'ORD-PX2-MATH-ENGLISH-STUDENT-QRIS' }),
    );
    const second = createSampleReceipt(
      createSampleOrder({ id: 'ORD-PX2-MATH-CHINESE-STUDENT-QRIS' }),
    );

    expect(first.receiptNumber).not.toBe(second.receiptNumber);
  });

  test('notification preferences default marketing to off', () => {
    expect(initialConsumerState.notificationPrefs.marketing).toBe(false);
    expect(initialConsumerState.notificationPrefs.inApp).toBe(true);
  });

  test('preview state lost resets to initial with flag', () => {
    let state: ConsumerState = {
      ...initialConsumerState,
      familyLinkStatus: 'active',
      linkedStudent: {
        id: 's1',
        name: 'Rina',
        examLanguage: 'English',
        subject: 'Math',
        linkStatus: 'active',
        linkedAt: '',
      },
    };
    state = consumerReducer(state, { type: 'PREVIEW_STATE_LOST' });
    expect(state.previewStateLost).toBe(true);
    expect(state.familyLinkStatus).toBe('noLink');
    expect(state.linkedStudent).toBeNull();
  });

  test('preview restart clears lost flag', () => {
    let state = consumerReducer(initialConsumerState, { type: 'PREVIEW_STATE_LOST' });
    state = consumerReducer(state, { type: 'PREVIEW_RESTART' });
    expect(state.previewStateLost).toBe(false);
  });
});
