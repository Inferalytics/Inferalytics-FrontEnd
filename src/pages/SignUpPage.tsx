import React, { useState } from 'react';
import { useSignUp } from '@clerk/clerk-react';
import { useNavigate, Link } from 'react-router-dom';
import { Sparkles, AlertCircle, RefreshCw, ArrowLeft, Mail, Eye, EyeOff } from 'lucide-react';
import AuthLayout from '../components/layout/AuthLayout';

export default function SignUpPage() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const navigate = useNavigate();

  React.useEffect(() => {
    sessionStorage.removeItem('has_seen_talk_intro');
  }, []);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState('');
  const [pendingVerification, setPendingVerification] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;

    setError('');
    setLoading(true);

    try {
      await signUp.create({
        firstName,
        lastName,
        emailAddress: email,
        password,
      });

      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setPendingVerification(true);
    } catch (err: any) {
      setError(err.errors?.[0]?.message || 'An error occurred during registration.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;

    setError('');
    setLoading(true);

    try {
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code,
      });

      if (completeSignUp.status === 'complete') {
        await setActive({ session: completeSignUp.createdSessionId });
        navigate('/');
      } else {
        setError('Verification failed or additional signup fields required.');
      }
    } catch (err: any) {
      setError(err.errors?.[0]?.message || 'Invalid verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="w-full flex flex-col gap-6 px-2 md:px-4">
        
        {/* Header / Welcoming titles */}
        <div className="flex flex-col gap-2">
          <h2 className="text-[24px] font-extrabold text-warm-text leading-tight tracking-tight font-sans">
            {pendingVerification ? 'Confirm your email' : 'Create your workspace'}
          </h2>
          <p className="text-[13px] text-warm-muted leading-relaxed">
            {pendingVerification 
              ? `We've sent a 6-digit confirmation code to your email address`
              : 'Scaffold your decision workspace and begin visual modelling'
            }
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 bg-destructive/10 border border-destructive/20 rounded-xl flex items-start gap-2.5 text-[11.5px] text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Phase 1: Input Profile Fields */}
        {!pendingVerification ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3.5">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10.5px] font-bold text-warm-muted uppercase tracking-wider pl-0.5">
                  First Name
                </label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Robert"
                  className="w-full px-3 py-2.5 border border-warm-border bg-white rounded-xl text-[12.5px] text-warm-text placeholder-warm-muted/50 focus:outline-none focus:border-brand-indigo focus:ring-1 focus:ring-ring transition-all"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10.5px] font-bold text-warm-muted uppercase tracking-wider pl-0.5">
                  Last Name
                </label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="M."
                  className="w-full px-3 py-2.5 border border-warm-border bg-white rounded-xl text-[12.5px] text-warm-text placeholder-warm-muted/50 focus:outline-none focus:border-brand-indigo focus:ring-1 focus:ring-ring transition-all"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10.5px] font-bold text-warm-muted uppercase tracking-wider pl-0.5">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="robert@company.com"
                className="w-full px-3 py-2.5 border border-warm-border bg-white rounded-xl text-[12.5px] text-warm-text placeholder-warm-muted/50 focus:outline-none focus:border-brand-indigo focus:ring-1 focus:ring-ring transition-all"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10.5px] font-bold text-warm-muted uppercase tracking-wider pl-0.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="*********"
                  className="w-full pl-3 pr-10 py-2.5 border border-warm-border bg-white rounded-xl text-[12.5px] text-warm-text placeholder-warm-muted/50 focus:outline-none focus:border-brand-indigo focus:ring-1 focus:ring-ring transition-all"
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
              className="w-full py-2.5 mt-2 rounded-xl bg-primary hover:opacity-90 active:opacity-100 text-primary-foreground text-[12.5px] font-bold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : null}
              Register Workspace
            </button>
          </form>
        ) : (
          /* Phase 2: Input Email OTP Verification Code */
          <form onSubmit={handleVerify} className="flex flex-col gap-4.5">
            <div className="flex flex-col gap-2">
              <label className="text-[10.5px] font-bold text-warm-muted uppercase tracking-wider text-center">
                6-Digit Verification Code
              </label>
              <div className="flex items-center justify-center gap-2 bg-white border border-warm-border rounded-xl p-3 focus-within:border-brand-indigo focus-within:ring-1 focus-within:ring-ring transition-all">
                <Mail className="h-4 w-4 text-warm-muted shrink-0" />
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="123456"
                  className="w-full max-w-[120px] text-center font-mono font-bold tracking-[0.3em] text-[15px] bg-transparent border-none outline-none focus:ring-0 text-warm-text placeholder-warm-muted/40"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !isLoaded}
              className="w-full py-2.5 rounded-xl bg-primary hover:opacity-90 active:opacity-100 text-primary-foreground text-[12.5px] font-bold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : null}
              Confirm Verification
            </button>

            <button
              type="button"
              onClick={() => {
                setError('');
                setPendingVerification(false);
              }}
              className="w-full py-1.5 rounded-xl hover:bg-secondary text-[11.5px] text-brand-indigo font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to registration
            </button>
          </form>
        )}

        <div className="text-[12.5px] text-warm-muted border-t border-warm-border/50 pt-5">
          Already have an account?{' '}
          <Link to="/sign-in" className="text-brand-indigo font-bold hover:underline">
            Sign in
          </Link>
        </div>

      </div>
    </AuthLayout>
  );
}
