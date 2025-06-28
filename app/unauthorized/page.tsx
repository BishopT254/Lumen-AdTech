'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';

export default function Unauthorized() {
  const { data: session } = useSession();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md rounded-lg bg-white p-8 shadow-md dark:bg-gray-800">
        <div className="flex justify-center">
          <div className="rounded-full bg-red-100 p-3 dark:bg-red-900/20">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12 text-red-600 dark:text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
        </div>
        <h1 className="mt-4 text-center text-2xl font-bold text-gray-900 dark:text-white">
          Unauthorized Access
        </h1>
        <p className="mt-2 text-center text-gray-600 dark:text-gray-300">
          You do not have permission to access this page.
        </p>
        
        {session?.user?.role && (
          <div className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
            You are currently signed in as <span className="font-medium">{session.user.email}</span> with role <span className="font-medium">{session.user.role}</span>.
          </div>
        )}
        
        <div className="mt-6 flex justify-center space-x-4">
          {session?.user?.role === 'ADMIN' && (
            <Link
              href="/admin"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600"
            >
              Go to Admin Dashboard
            </Link>
          )}
          
          {session?.user?.role === 'ADVERTISER' && (
            <Link
              href="/advertiser"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600"
            >
              Go to Advertiser Dashboard
            </Link>
          )}
          
          {session?.user?.role === 'PARTNER' && (
            <Link
              href="/partner"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600"
            >
              Go to Partner Dashboard
            </Link>
          )}
          
          <Link
            href="/"
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
} 