import React, { useState } from 'react';
import { useSignIn } from '@clerk/clerk-react';
import { useNavigate, Link } from 'react-router-dom';
import { Sparkles, AlertCircle, RefreshCw, Eye, EyeOff } from 'lucide-react';
import AuthLayout from '../components/layout/AuthLayout';

export default function SignInPage() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const navigate = useNavigate();

  React.useEffect(() => {
    sessionStorage.removeItem('has_seen_talk_intro');
  }, []);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [needsSecondFactor, setNeedsSecondFactor] = useState(false);
  const [code, setCode] = useState('');

  const completeSignIn = async (createdSessionId: string | null) => {
    if (!setActive || !createdSessionId) return;
    await setActive({ session: createdSessionId });
    navigate('/');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;

    setError('');
    setLoading(true);

    try {
      const result = await signIn.create({
        identifier: email,
        password: password,
      });

      if (result.status === 'complete') {
        await completeSignIn(result.createdSessionId);
      } else if (result.status === 'needs_second_factor') {
        await signIn.prepareSecondFactor({ strategy: 'email_code' });
        setNeedsSecondFactor(true);
      } else {
        setError('Verification or additional steps required.');
      }
    } catch (err: any) {
      setError(err.errors?.[0]?.message || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;

    setError('');
    setLoading(true);

    try {
      const result = await signIn.attemptSecondFactor({
        strategy: 'email_code',
        code,
      });

      if (result.status === 'complete') {
        await completeSignIn(result.createdSessionId);
      } else {
        setError('Verification or additional steps required.');
      }
    } catch (err: any) {
      setError(err.errors?.[0]?.message || 'Invalid or expired code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (needsSecondFactor) {
    return (
      <AuthLayout>
        <div className="w-full flex flex-col gap-6 px-2 md:px-4">
          <div className="flex flex-col gap-2">
            <h2 className="text-[24px] font-extrabold text-warm-text leading-tight tracking-tight font-sans">
              Check your email
            </h2>
            <p className="text-[13px] text-warm-muted leading-relaxed">
              Enter the verification code sent to {email}
            </p>
          </div>

          {error && (
            <div className="p-3.5 bg-destructive/10 border border-destructive/20 rounded-xl flex items-start gap-2.5 text-[11.5px] text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleVerifyCode} className="flex flex-col gap-4.5">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10.5px] font-bold text-warm-muted uppercase tracking-wider pl-0.5">
                Verification Code
              </label>
              <input
                type="text"
                inputMode="numeric"
                required
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                className="w-full px-3 py-2.5 border border-warm-border bg-white rounded-xl text-[12.5px] text-warm-text placeholder-warm-muted/50 focus:outline-none focus:border-brand-indigo focus:ring-1 focus:ring-ring transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !isLoaded}
              className="w-full py-2.5 mt-2 rounded-xl bg-primary hover:opacity-90 active:opacity-100 text-primary-foreground text-[12.5px] font-bold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : null}
              Verify
            </button>
          </form>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="w-full flex flex-col gap-6 px-2 md:px-4">

        {/* Header / Welcoming titles */}
        <div className="flex flex-col gap-1.5">
          <h2 className="text-[24px] sm:text-[26px] font-bold text-warm-text leading-tight tracking-tight">
            Welcome back
          </h2>
          <p className="text-[13px] text-warm-muted leading-relaxed">
            Enter your credentials to access your decision workspace
          </p>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-[12px] text-red-600">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Form elements */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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

          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center pl-0.5">
              <label className="text-[11px] font-bold text-warm-muted uppercase tracking-wider font-mono">
                Password
              </label>
              <Link to="/forgot-password" className="text-[11px] text-[#FF5A1F] font-bold hover:underline">
                Forgot password?
              </Link>
            </div>
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
            {loading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : null}
            Sign In
          </button>
        </form>

        <div className="text-[12.5px] text-warm-muted border-t border-warm-border/60 pt-5">
          Don't have an account?{' '}
          <Link to="/sign-up" className="text-[#FF5A1F] font-bold hover:underline">
            Sign up
          </Link>
        </div>

      </div>
    </AuthLayout>
  );
}
