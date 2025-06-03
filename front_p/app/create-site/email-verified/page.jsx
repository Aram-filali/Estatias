'use client';

import { useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import VerifyEmail from '../../../components/VerifyEmail/VerifyEmail';

export default function VerifyEmailPage() {
  // Base hooks
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const searchParams = useSearchParams();
  
  // Use effect for initialization
  useEffect(() => {
    try {
      setIsLoading(false);
    } catch (err) {
      console.error("Error in VerifyEmailPage:", err);
      setError(err.message);
      setIsLoading(false);
    }
  }, []);

  // Render function based on state
  const renderContent = () => {
    // Show error if there's an error
    if (error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
            <h1 className="text-2xl font-bold mb-4 text-center text-red-600">
              Loading Error
            </h1>
            <p className="text-center">{error}</p>
            <p className="text-center mt-4">
              Please try again or contact support.
            </p>
          </div>
        </div>
      );
    }

    // Show loading state
    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      );
    }

    // Try to render the component - this will handle both cases:
    // 1. User arrives with a token in URL (from email link)
    // 2. User arrives without a token (normal visit to verify-email page)
    try {
      return <VerifyEmail />;
    } catch (err) {
      console.error("Error rendering VerifyEmail:", err);
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
            <h1 className="text-2xl font-bold mb-4 text-center text-red-600">
              Component Error
            </h1>
            <p className="text-center">{err.message}</p>
          </div>
        </div>
      );
    }
  };

  // Return the rendered content
  return renderContent();
}
