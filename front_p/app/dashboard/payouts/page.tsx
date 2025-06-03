// app/dashboard/payouts/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import axios from 'axios';
import { useRouter } from 'next/navigation';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface Payout {
  _id: string;
  bookingId: string;
  amount: number;
  hostAmount: number;
  platformFee: number;
  currency: string;
  status: string;
  completedAt: string;
  createdAt: string;
}

export default function PayoutsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const router = useRouter();

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const token = await user.getIdToken();
          setAuthToken(token);
          setUserId(user.uid);
          await fetchPayouts(user.uid, token);
        } catch (err) {
          console.error("Error getting authentication token:", err);
          setError("Authentication error. Please try logging in again.");
        } finally {
          setLoading(false);
        }
      } else {
        setError("You must be logged in to view this page.");
        setLoading(false);
        router.push('/login');
      }
    });
    
    return () => unsubscribe();
  }, [router]);

  const fetchPayouts = async (hostId: string, token: string) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/connect/payouts/${hostId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPayouts(response.data);
    } catch (err) {
      console.error("Error fetching payouts:", err);
      setError("Failed to fetch your payout history.");
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: currency || 'EUR',
      minimumFractionDigits: 2
    }).format(amount / 100); // Stripe amounts are in cents
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Payout History</h1>
      
      {payouts.length === 0 ? (
        <div className="bg-white p-6 rounded-lg shadow-md text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h2 className="text-xl font-semibold mb-2">No Payout History</h2>
          <p className="text-gray-600">
            You don't have any completed payouts yet. They'll appear here once guests make bookings.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full whitespace-nowrap">
              <thead className="bg-gray-100">
                <tr className="text-left text-gray-600 uppercase text-xs tracking-wider">
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Booking ID</th>
                  <th className="px-6 py-3">Total Amount</th>
                  <th className="px-6 py-3">Platform Fee</th>
                  <th className="px-6 py-3">Your Earnings</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {payouts.map((payout) => (
                  <tr key={payout._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      {payout.completedAt ? formatDate(payout.completedAt) : formatDate(payout.createdAt)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium">#{payout.bookingId.substring(0, 8)}</span>
                    </td>
                    <td className="px-6 py-4">
                      {formatCurrency(payout.amount, payout.currency)}
                    </td>
                    <td className="px-6 py-4">
                      {formatCurrency(payout.platformFee, payout.currency)}
                    </td>
                    <td className="px-6 py-4 font-medium">
                      {formatCurrency(payout.hostAmount, payout.currency)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        payout.status === 'completed' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {payout.status === 'completed' ? 'Paid' : 'Pending'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      <div className="mt-8 bg-blue-50 border-l-4 border-blue-500 p-4">
        <h3 className="font-medium text-blue-800">About Payouts</h3>
        <p className="mt-2 text-blue-700">
          Payouts are processed automatically when a guest makes a booking.
          Premium plan hosts receive 100% of the booking amount, while Standard plan hosts receive 95%
          (5% platform fee applies).
        </p>
      </div>
    </div>
  );
}