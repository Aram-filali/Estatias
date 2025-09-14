// components/RoleBasedComponent.js
"use client";

import { useAuth } from '../context/AuthContext';

const RoleBasedComponent = ({
  children,
  allowedRoles = [],
  fallback = null,
  hostComponent = null,
  userComponent = null
}) => {
  const { userRole, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  // If specific components are provided for each role
  if (hostComponent && userRole === 'host') {
    return hostComponent;
  }
  if (userComponent && userRole === 'user') {
    return userComponent;
  }

  // Check if current role is allowed
  if (allowedRoles.length === 0 || allowedRoles.includes(userRole)) {
    return children;
  }

  return fallback;
};

export default RoleBasedComponent;