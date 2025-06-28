'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function ErrorPage() {
  const searchParams = useSearchParams();
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  useEffect(() => {
    const error = searchParams.get('error');
    
    // Map error codes to user-friendly messages
    if (error === 'CredentialsSignin') {
      setErrorMessage('Invalid email or password. Please try again.');
    } else if (error === 'OAuthAccountNotLinked') {
      setErrorMessage('This email is already associated with another account. Please sign in using the original method.');
    } else if (error === 'OAuthSignin') {
      setErrorMessage('Error signing in with this provider. Please try again or use another method.');
    } else if (error === 'OAuthCallback') {
      setErrorMessage('Error processing the authentication. Please try again.');
    } else if (error === 'AccessDenied') {
      setErrorMessage('Access denied. You do not have permission to sign in.');
    } else if (error === 'Verification') {
      setErrorMessage('The verification link is invalid or has expired.');
    } else {
      setErrorMessage('An unexpected error occurred during authentication.');
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-gray-800 p-8 rounded-xl shadow-md">
        <div>
          <div className="flex justify-center">
            <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center">
              <span className="text-xl font-bold text-white">!</span>
            </div>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Authentication Error
          </h2>
        </div>

        <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-4 rounded-md">
          {errorMessage}
        </div>

        <div className="flex flex-col space-y-4">
          <Link href="/auth/signin" className="w-full py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors flex items-center justify-center">
            Back to Sign In
          </Link>
          <Link href="/" className="w-full py-2 px-4 border border-gray-300 dark:border-gray-700 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-center">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
} 