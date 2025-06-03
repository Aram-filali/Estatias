import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';

export default function VerifyEmailTest() {
  const router = useRouter();
  const { token } = router.query;
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
    console.log("Pages Router Test Page mounted");
    console.log("Token from query:", token);
  }, [token]);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-4 text-center">
          Pages Router Test
        </h1>
        <p className="text-center">
          {mounted ? "Component Mounted" : "Component Loading"}
        </p>
        <pre className="mt-4 p-4 bg-gray-100 rounded overflow-auto">
          Token: {token || "waiting for token..."}
        </pre>
      </div>
    </div>
  );
}