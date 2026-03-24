"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Building2 } from "lucide-react";

function LoginContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  return (
    <main className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* Cartoon city background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('/login-bg.jpg')`,
        }}
      />
      {/* Soft overlay for readability */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Card */}
      <div className="relative max-w-md w-full bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl p-8 sm:p-10 text-center fade-in">
        <div className="flex justify-center mb-5">
          <div className="bg-blue-100 p-4 rounded-full shadow-md">
            <Building2 className="w-10 h-10 text-blue-700" />
          </div>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-2 tracking-tight">
          SV Towers
        </h1>
        <p className="text-gray-500 mb-8 text-sm">
          Finance Manager &mdash; Sign in to continue
        </p>

        {error === "not_authorized" ? (
          <div role="alert" className="bg-red-50 text-red-700 rounded-lg p-3 mb-6 text-sm">
            Access denied. Your account is not authorized to use this app. Contact the administrator.
          </div>
        ) : error ? (
          <div role="alert" className="bg-red-50 text-red-700 rounded-lg p-3 mb-6 text-sm">
            Sign in failed. Please try again.
          </div>
        ) : null}

        <a
          href="/api/auth/google"
          className="inline-flex items-center justify-center gap-3 w-full bg-white border border-gray-300 rounded-xl px-6 py-3.5 text-base font-semibold text-gray-700 hover:bg-gray-50 hover:shadow-lg transition-all"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Sign in with Google
        </a>

        <p className="text-xs text-gray-400 mt-6">
          Secure login powered by Google OAuth
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
