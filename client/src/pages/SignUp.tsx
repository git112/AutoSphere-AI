import { motion } from 'framer-motion';
import { Orbit, Mail, Lock, User, Chrome, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';
import * as authService from '@/services/authService';
import OtpModal from '@/components/OtpModal';
import { AxiosError } from 'axios';

const SignUp = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // OTP modal states
  const [otpOpen, setOtpOpen] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpSuccess, setOtpSuccess] = useState(false);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signup, isLoading, error, clearError } = useAuthStore();

  // Read ?message=account_not_found from URL (redirected from Login)
  const redirectMessage = searchParams.get('message');
  const accountNotFoundMsg =
    redirectMessage === 'account_not_found'
      ? "Account not found. Please create a new account."
      : null;

  // OTP resend handler
  const handleSendOtp = async () => {
    setOtpSending(true);
    setOtpError(null);
    try {
      await authService.sendOtp(email, 'signup', name);
    } catch (err) {
      const errMsg =
        err instanceof AxiosError
          ? err.response?.data?.detail ?? 'Failed to send OTP'
          : 'Failed to send OTP';
      setOtpError(errMsg);
    } finally {
      setOtpSending(false);
    }
  };

  // Signup form submit → create account → send OTP → open modal
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      await signup(email, password, name);
      // Account created — now send OTP
      setOtpError(null);
      setOtpSuccess(false);
      setOtpOpen(true);
      await handleSendOtp();
    } catch {
      // error is already set in the store
    }
  };

  // OTP verify handler
  const handleVerifyOtp = async (otp: string) => {
    setOtpVerifying(true);
    setOtpError(null);
    try {
      await authService.verifySignupOtp(email, otp);
      setOtpSuccess(true);
      toast.success('Account verified successfully! Welcome to AutoSphere 🚀');
      setTimeout(() => {
        setOtpOpen(false);
        navigate('/login');
      }, 1800);
    } catch (err) {
      const errMsg =
        err instanceof AxiosError
          ? err.response?.data?.detail ?? 'Invalid OTP. Please try again.'
          : 'Invalid OTP. Please try again.';
      setOtpError(errMsg);
    } finally {
      setOtpVerifying(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Glow orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-neon-cyan/5 rounded-full blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="glass-card-glow p-8">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <Link to="/">
              <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center neon-glow mb-4">
                <Orbit className="w-8 h-8 text-primary-foreground" />
              </div>
            </Link>
            <h1 className="text-2xl font-display font-bold gradient-text">Create Account</h1>
            <p className="text-muted-foreground text-sm mt-1">Start your free trial today</p>
          </div>

          {/* Account-not-found banner (redirected from login) */}
          {accountNotFoundMsg && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-2.5 p-3 mb-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm"
            >
              <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{accountNotFoundMsg}</span>
            </motion.div>
          )}

          {/* Error message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-2.5 p-3 mb-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm"
            >
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => { setName(e.target.value); clearError(); }}
                  placeholder="John Doe"
                  required
                  minLength={2}
                  className="w-full h-11 pl-10 pr-4 rounded-xl bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all text-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); clearError(); }}
                  placeholder="you@company.com"
                  required
                  className="w-full h-11 pl-10 pr-4 rounded-xl bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all text-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); clearError(); }}
                  placeholder="••••••••"
                  required
                  minLength={8}
                  className="w-full h-11 pl-10 pr-4 rounded-xl bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all text-sm"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                Min 8 chars with uppercase, lowercase, digit &amp; special character
              </p>
            </div>

            <p className="text-xs text-muted-foreground">
              By signing up you agree to our{' '}
              <a href="#" className="text-primary hover:underline">Terms</a> and{' '}
              <a href="#" className="text-primary hover:underline">Privacy Policy</a>.
            </p>

            <button
              type="submit"
              disabled={isLoading || otpSending}
              className="w-full h-11 rounded-xl gradient-primary text-primary-foreground font-semibold text-sm hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] transition-all duration-300 mt-2 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading || otpSending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isLoading ? 'Creating account…' : 'Sending OTP…'}
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">or sign up with</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Social */}
          <div className="grid grid-cols-2 gap-3">
            <button className="h-10 rounded-xl border border-border bg-muted/30 text-sm text-foreground hover:bg-muted/60 transition-colors flex items-center justify-center gap-2">
              <Chrome className="w-4 h-4" />
              Google
            </button>
            <button className="h-10 rounded-xl border border-border bg-muted/30 text-sm text-foreground hover:bg-muted/60 transition-colors flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
              LinkedIn
            </button>
          </div>

          {/* Login link */}
          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-primary hover:underline font-medium">Sign In</Link>
          </p>
        </div>
      </motion.div>

      {/* OTP Modal */}
      <OtpModal
        isOpen={otpOpen}
        email={email}
        purpose="signup"
        title="Verify Your Email"
        description="We sent a 6-digit verification code to"
        isVerifying={otpVerifying}
        isSending={otpSending}
        error={otpError}
        success={otpSuccess}
        successMessage="Account verified! Redirecting to sign in…"
        onVerify={handleVerifyOtp}
        onResend={handleSendOtp}
        onClose={() => setOtpOpen(false)}
      />
    </div>
  );
};

export default SignUp;
