"use client";
import { Suspense } from 'react';
import SuccessPage from '../../components/prices/SuccessPage';  // Adjust the import path as needed

// Composant de fallback
const LoadingFallback = () => (
  <div style={{ padding: '20px', textAlign: 'center' }}>
    <p>Loading...</p>
  </div>
);

// This is the main page file
export default function Success() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SuccessPage />
    </Suspense>
  );
}