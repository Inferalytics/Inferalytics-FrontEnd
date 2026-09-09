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
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-warm-muted uppercase tracking-wider font-mono pl-0.5">
                  First Name
                </label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Robert"
                  className="w-full px-3.5 py-2.5 border border-warm-border bg-white rounded-xl text-[13px] text-warm-text placeholder:text-warm-muted/50 focus:outline-none focus:border-[#FF5A1F] focus:ring-2 focus:ring-[#FF5A1F]/20 transition-all font-sans"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-warm-muted uppercase tracking-wider font-mono pl-0.5">
                  Last Name
                </label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Smith"
                  className="w-full px-3.5 py-2.5 border border-warm-border bg-white rounded-xl text-[13px] text-warm-text placeholder:text-warm-muted/50 focus:outline-none focus:border-[#FF5A1F] focus:ring-2 focus:ring-[#FF5A1F]/20 transition-all font-sans"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-warm-muted uppercase tracking-wider font-mono pl-0.5">
                Work Email
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
              <label className="text-[11px] font-bold text-warm-muted uppercase tracking-wider font-mono pl-0.5">
                Password
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
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : null}
              Create Account
            </button>
          </form>
        ) : (
          /* Phase 2: Enter Verification Code */
          <form onSubmit={handleVerify} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-warm-muted uppercase tracking-wider font-mono pl-0.5">
                Verification Code
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="123456"
                  className="w-full pl-3.5 pr-10 py-2.5 border border-warm-border bg-white rounded-xl text-[13px] text-warm-text placeholder:text-warm-muted/50 focus:outline-none focus:border-[#FF5A1F] focus:ring-2 focus:ring-[#FF5A1F]/20 transition-all font-mono tracking-widest"
                />
                <Mail className="h-4 w-4 text-warm-muted absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
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
              Verify &amp; Enter Workspace
            </button>

            <button
              type="button"
              onClick={() => setPendingVerification(false)}
              className="w-full py-2 text-[12px] text-warm-muted hover:text-warm-text transition-colors flex items-center justify-center gap-1 cursor-pointer font-medium"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Change Email
            </button>
          </form>
        )}

        <div className="text-[12.5px] text-warm-muted border-t border-warm-border/60 pt-5">
          Already have an account?{' '}
          <Link to="/sign-in" className="text-[#FF5A1F] font-bold hover:underline">
            Sign in
          </Link>
        </div>

      </div>
    </AuthLayout>
  );
}
