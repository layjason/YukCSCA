import type { components } from '@/shared/api/generated/openapi';

export type UserRole = components['schemas']['Auth.UserRole'];
export type CurrentUser = components['schemas']['Auth.CurrentUser'];
export type AuthResponse = components['schemas']['Auth.AuthResponse'];

export type AuthStatus = 'loading' | 'anonymous' | 'authenticated';
