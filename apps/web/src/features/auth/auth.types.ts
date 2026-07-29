import type { components } from '@/shared/api/generated/openapi';

export type UserRole = components['schemas']['Auth.UserRole'];
export type CurrentUser = components['schemas']['Auth.CurrentUser'];
export type AuthResponse = components['schemas']['Auth.AuthResponse'];
export type StartCredentialRegistrationRequest =
  components['schemas']['Auth.StartCredentialRegistrationRequest'];
export type ResendCredentialVerificationRequest =
  components['schemas']['Auth.ResendCredentialVerificationRequest'];
export type CompleteCredentialVerificationRequest =
  components['schemas']['Auth.CompleteCredentialVerificationRequest'];
export type CredentialLoginRequest = components['schemas']['Auth.CredentialLoginRequest'];
export type CredentialVerificationResult =
  components['schemas']['Auth.CredentialVerificationResult'];
export type CredentialVerificationOutcome =
  components['schemas']['Auth.CredentialVerificationOutcome'];

export type PasswordRecoveryRequest = components['schemas']['Auth.PasswordRecoveryRequest'];
export type CompletePasswordRecoveryRequest =
  components['schemas']['Auth.CompletePasswordRecoveryRequest'];

export type AuthStatus = 'loading' | 'anonymous' | 'authenticated';
