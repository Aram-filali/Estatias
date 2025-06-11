// 6. Frontend utility functions
// frontend/utils/auth.ts
export interface UserInfo {
  firebaseUid: string;
  role: 'admin' | 'host' | 'user';
  // Don't assume other fields as they vary by user type
}

export const checkUserRole = (user: UserInfo, requiredRoles: string[]): boolean => {
  return requiredRoles.includes(user.role);
};

export const isAdmin = (user: UserInfo): boolean => {
  return user.role === 'admin';
};

export const isHost = (user: UserInfo): boolean => {
  return user.role === 'host';
};

export const isUser = (user: UserInfo): boolean => {
  return user.role === 'user';
};