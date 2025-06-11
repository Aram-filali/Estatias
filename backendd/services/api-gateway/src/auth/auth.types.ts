// FILE: src/auth/auth.types.ts
// ==========================================
export enum UserRole {
  ADMIN = 'admin',
  HOST = 'host',
  USER = 'user'
}

export interface DecodedToken {
  uid: string;
  email: string;
  role: UserRole;
  emailVerified: boolean;
  exp: number;
  iat: number;
}