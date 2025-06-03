export default function SuccessPage() {
    return (
      <div className="p-6 max-w-md mx-auto text-center">
        <h1 className="text-2xl font-bold mb-4">Payment Successful!</h1>
        <p>Your subscription has been activated successfully.</p>
        <a 
          href="/dashboard/subscription" 
          className="mt-4 inline-block bg-blue-500 text-white px-4 py-2 rounded"
        >
          Return to Subscription
        </a>
      </div>
    );
  }