import React, { useState } from 'react';
import { useSignIn } from '@clerk/clerk-react';
import { useNavigate, Link } from 'react-router-dom';
import { AlertCircle, RefreshCw, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import AuthLayout from '../components/layout/AuthLayout';

export default function ForgotPasswordPage() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [successfulCreation, setSuccessfulCreation] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const requestPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;

    setError('');
    setLoading(true);

    try {
      await signIn.create({
        strategy: 'reset_password_email_code',
        identifier: email,
      });
      setSuccessfulCreation(true);
      setError('');
    } catch (err: any) {
      setError(err.errors?.[0]?.message || 'Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;

    setError('');
    setLoading(true);

    try {
      const result = await signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code,
        password,
      });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        navigate('/');
      } else {
        setError('Something went wrong, please try again.');
      }
    } catch (err: any) {
      setError(err.errors?.[0]?.message || 'Invalid code or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="w-full flex flex-col gap-6 px-2 md:px-4">
        <Link to="/sign-in" className="flex items-center gap-1.5 text-[12.5px] text-warm-muted hover:text-warm-text transition-colors w-fit font-semibold">
          <ArrowLeft className="h-4 w-4" />
          Back to Sign In
        </Link>
        
        <div className="flex flex-col gap-1.5">
          <h2 className="text-[24px] sm:text-[26px] font-bold text-warm-text leading-tight tracking-tight">
            Reset Password
          </h2>
          <p className="text-[13px] text-warm-muted leading-relaxed">
            {successfulCreation 
              ? 'Enter the code sent to your email and a new password.'
              : 'Enter your email address to receive a password reset code.'}
          </p>
        </div>

        {error && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-[12px] text-red-600">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {!successfulCreation ? (
          <form onSubmit={requestPasswordReset} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-warm-muted uppercase tracking-wider font-mono pl-0.5">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="robert@company.com"
                className="w-full px-3.5 py-2.5 border border-warm-border bg-white rounded-xl text-[13px] text-warm-text placeholder:text-warm-muted/50 focus:outline-none focus:border-[#FF5A1F] focus:ring-2 focus:ring-[#FF5A1F]/20 transition-all font-sans"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !isLoaded}
              className="w-full py-2.5 mt-2 rounded-xl bg-[#FF5A1F] hover:opacity-90 active:opacity-100 text-white text-[13px] font-bold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : null}
              Send Reset Code
            </button>
          </form>
        ) : (
          <form onSubmit={resetPassword} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-warm-muted uppercase tracking-wider font-mono pl-0.5">
                Reset Code
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                className="w-full px-3.5 py-2.5 border border-warm-border bg-white rounded-xl text-[13px] text-warm-text placeholder:text-warm-muted/50 focus:outline-none focus:border-[#FF5A1F] focus:ring-2 focus:ring-[#FF5A1F]/20 transition-all font-mono tracking-widest"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-warm-muted uppercase tracking-wider font-mono pl-0.5">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-3.5 pr-10 py-2.5 border border-warm-border bg-white rounded-xl text-[13px] text-warm-text placeholder:text-warm-muted/50 focus:outline-none focus:border-[#FF5A1F] focus:ring-2 focus:ring-[#FF5A1F]/20 transition-all font-sans"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-warm-muted hover:text-warm-text focus:outline-none cursor-pointer flex items-center justify-center"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !isLoaded}
              className="w-full py-2.5 mt-2 rounded-xl bg-[#FF5A1F] hover:opacity-90 active:opacity-100 text-white text-[13px] font-bold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : null}
              Update Password &amp; Sign In
            </button>
          </form>
        )}
      </div>
    </AuthLayout>
  );
}
