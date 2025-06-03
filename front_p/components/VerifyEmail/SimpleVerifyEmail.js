'use client';

import { useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function SimpleVerifyPage() {
  // Always call hooks at the top level
  const [mounted, setMounted] = useState(false);
  const searchParams = useSearchParams();
  const token = searchParams ? searchParams.get('token') : 'No token found';
  
  useEffect(() => {
    console.log("Simple verification page mounted");
    console.log("Token from URL:", token);
    setMounted(true);
  }, [token]);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-4 text-center">
          Simple Verification Test
        </h1>
        <div className="text-center">
          <p className="mb-4">Component Status: {mounted ? "Mounted" : "Mounting..."}</p>
          <div className="mt-4 p-4 bg-gray-100 rounded text-left overflow-hidden">
            <p className="font-bold">Token:</p>
            <p className="break-all mt-1">{token}</p>
          </div>
        </div>
      </div>
    </div>
  );
}