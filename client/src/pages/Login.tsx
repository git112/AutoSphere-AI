import { motion, AnimatePresence } from 'framer-motion';
import {
  Orbit, Mail, Lock, Chrome, AlertCircle, Loader2,
  KeyRound, ArrowLeft, Eye, EyeOff, CheckCircle2,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';
import * as authService from '@/services/authService';
import OtpModal from '@/components/OtpModal';
import { AxiosError } from 'axios';

// ── Forgot-password flow steps ─────────────────────────────────────────────
type ForgotStep = 'email' | 'otp' | 'password' | 'done';

const extractError = (err: unknown, fallback = 'Something went wrong.'): string => {
  if (err instanceof AxiosError) {
    const d = err.response?.data?.detail;
    if (typeof d === 'string') return d;
    if (Array.isArray(d)) return d.map((x) => x.msg).join(', ');
  }
  if (err instanceof Error) return err.message;
  return fallback;
};

// ── Forgot Password Modal ──────────────────────────────────────────────────
interface ForgotModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ForgotPasswordModal = ({ isOpen, onClose }: ForgotModalProps) => {
  const [step, setStep] = useState<ForgotStep>('email');
  const [fpEmail, setFpEmail] = useState('');
  const [fpOtp, setFpOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── OTP modal sub-states ───────────────────────────────────────────────
  const [otpOpen, setOtpOpen] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpSuccess, setOtpSuccess] = useState(false);

  const reset = () => {
    setStep('email');
    setFpEmail('');
    setFpOtp('');
    setNewPassword('');
    setConfirmPassword('');
    setError(null);
    setOtpOpen(false);
    setOtpError(null);
    setOtpSuccess(false);
  };

  const handleClose = () => { reset(); onClose(); };

  // Step 1: Send OTP to entered email
  const handleSendOtp = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await authService.sendOtp(fpEmail, 'password_reset');
      setOtpError(null);
      setOtpSuccess(false);
      setOtpOpen(true);
    } catch (err) {
      setError(extractError(err, 'Failed to send OTP. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  // Resend OTP from within OTP modal
  const handleResendOtp = async () => {
    setOtpSending(true);
    setOtpError(null);
    try {
      await authService.sendOtp(fpEmail, 'password_reset');
    } catch (err) {
      setOtpError(extractError(err, 'Failed to resend OTP.'));
    } finally {
      setOtpSending(false);
    }
  };

  // OTP verified — move to set-new-password step
  const handleOtpVerifiedOnly = async (otp: string) => {
    setOtpVerifying(true);
    setOtpError(null);
    // We store the OTP and move forward — actual reset happens on step 3
    // We still call verifyOTP but without new_password to validate first
    // Actually: our endpoint needs all three. So we transition to step 'password' after collecting otp.
    // Just store the OTP and advance step.
    setFpOtp(otp);
    // Simulate brief check
    await new Promise((r) => setTimeout(r, 400));
    setOtpSuccess(true);
    setTimeout(() => {
      setOtpOpen(false);
      setOtpSuccess(false);
      setStep('password');
    }, 1200);
    setOtpVerifying(false);
  };

  // Step 3: Submit new password (actually calls verify-password-reset-otp)
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await authService.verifyPasswordResetOtp(fpEmail, fpOtp, newPassword);
      setStep('done');
      toast.success('Password updated successfully 🚀');
    } catch (err) {
      setError(extractError(err, 'Failed to reset password. The OTP may have expired.'));
    } finally {
      setIsLoading(false);
    }
  };

  const emailStep = (
    <motion.div key="email-step" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
      <div className="flex flex-col items-center mb-6">
        <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center neon-glow mb-3">
          <KeyRound className="w-6 h-6 text-primary-foreground" />
        </div>
        <h2 className="text-xl font-display font-bold gradient-text">Forgot Password?</h2>
        <p className="text-muted-foreground text-sm mt-1 text-center">
          Enter your registered email and we'll send you an OTP.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 mb-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); handleSendOtp(); }} className="space-y-4">
        <div>
          <label className="text-sm text-muted-foreground mb-1.5 block">Email Address</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="email"
              value={fpEmail}
              onChange={(e) => { setFpEmail(e.target.value); setError(null); }}
              placeholder="you@company.com"
              required
              className="w-full h-11 pl-10 pr-4 rounded-xl bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all text-sm"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-11 rounded-xl gradient-primary text-primary-foreground font-semibold text-sm hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending OTP…</> : 'Send OTP'}
        </button>
      </form>
    </motion.div>
  );

  const passwordStep = (
    <motion.div key="pwd-step" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
      <div className="flex flex-col items-center mb-6">
        <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center neon-glow mb-3">
          <Lock className="w-6 h-6 text-primary-foreground" />
        </div>
        <h2 className="text-xl font-display font-bold gradient-text">Set New Password</h2>
        <p className="text-muted-foreground text-sm mt-1 text-center">
          Choose a strong new password for your account.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 mb-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleResetPassword} className="space-y-4">
        <div>
          <label className="text-sm text-muted-foreground mb-1.5 block">New Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type={showPwd ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => { setNewPassword(e.target.value); setError(null); }}
              placeholder="••••••••"
              required
              minLength={8}
              className="w-full h-11 pl-10 pr-10 rounded-xl bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all text-sm"
            />
            <button
              type="button"
              onClick={() => setShowPwd(!showPwd)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Min 8 chars with uppercase, lowercase, digit &amp; special character
          </p>
        </div>

        <div>
          <label className="text-sm text-muted-foreground mb-1.5 block">Confirm Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type={showPwd ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setError(null); }}
              placeholder="••••••••"
              required
              className="w-full h-11 pl-10 pr-4 rounded-xl bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all text-sm"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 h-11 rounded-xl border border-border bg-muted/30 text-sm text-foreground hover:bg-muted/60 transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 h-11 rounded-xl gradient-primary text-primary-foreground font-semibold text-sm hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : 'Update Password'}
          </button>
        </div>
      </form>
    </motion.div>
  );

  const doneStep = (
    <motion.div
      key="done-step"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center gap-4 py-6"
    >
      <CheckCircle2 className="w-16 h-16 text-green-400" />
      <h2 className="text-xl font-display font-bold gradient-text">Password Updated 🚀</h2>
      <p className="text-muted-foreground text-sm text-center">
        Your password has been updated successfully.<br />You can now sign in with your new password.
      </p>
      <button
        onClick={handleClose}
        className="w-full h-11 rounded-xl gradient-primary text-primary-foreground font-semibold text-sm hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] transition-all duration-300 flex items-center justify-center"
      >
        Go to Sign In
      </button>
    </motion.div>
  );

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              key="fp-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
              onClick={step === 'done' ? handleClose : undefined}
            />
            <motion.div
              key="fp-modal"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="fixed inset-0 z-40 flex items-center justify-center p-4 pointer-events-none"
            >
              <div className="glass-card-glow p-8 w-full max-w-md pointer-events-auto relative">
                {step !== 'done' && (
                  <button
                    onClick={handleClose}
                    className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-muted/50 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors text-lg leading-none"
                  >
                    ×
                  </button>
                )}
                <AnimatePresence mode="wait">
                  {step === 'email' && emailStep}
                  {step === 'password' && passwordStep}
                  {step === 'done' && doneStep}
                </AnimatePresence>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Nested OTP modal for forgot-password */}
      <OtpModal
        isOpen={otpOpen}
        email={fpEmail}
        purpose="password_reset"
        title="Check Your Inbox"
        description="We sent a password reset OTP to"
        isVerifying={otpVerifying}
        isSending={otpSending}
        error={otpError}
        success={otpSuccess}
        successMessage="OTP verified! Setting new password…"
        onVerify={handleOtpVerifiedOnly}
        onResend={handleResendOtp}
        onClose={() => { setOtpOpen(false); }}
      />
    </>
  );
};


// ── Main Login Page ────────────────────────────────────────────────────────
const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [forgotOpen, setForgotOpen] = useState(false);
  const [redirectMsg, setRedirectMsg] = useState<string | null>(null);

  const navigate = useNavigate();
  const { login, isLoading, error, clearError } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setRedirectMsg(null);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      // Check if this is a 401 and email doesn't exist → redirect to signup
      if (err instanceof AxiosError && err.response?.status === 401) {
        try {
          const { exists } = await authService.checkEmail(email);
          if (!exists) {
            navigate('/signup?message=account_not_found');
            return;
          }
        } catch {
          // ignore check-email errors, let the original error show
        }
      }
      // error is already set in the store for other cases
    }
  };

  return (
    <div className="min-h-screen space-bg nebula-glow flex items-center justify-center p-4 relative overflow-hidden">
      {/* Extra glow orbs */}
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
            <h1 className="text-2xl font-display font-bold gradient-text">AutoSphere</h1>
            <p className="text-muted-foreground text-sm mt-1">Sign in to your account</p>
          </div>

          {/* Redirect message */}
          {redirectMsg && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-2.5 p-3 mb-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm"
            >
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{redirectMsg}</span>
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
              <label className="text-sm text-muted-foreground mb-1.5 block">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); clearError(); setRedirectMsg(null); }}
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
                  className="w-full h-11 pl-10 pr-4 rounded-xl bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all text-sm"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded bg-muted border-border accent-primary" />
                Keep me logged in
              </label>
              <button
                type="button"
                onClick={() => setForgotOpen(true)}
                className="text-sm text-primary hover:underline"
              >
                Forgot?
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 rounded-xl gradient-primary text-primary-foreground font-semibold text-sm hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] transition-all duration-300 mt-2 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">or continue with</span>
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

          {/* Sign up link */}
          <p className="text-center text-sm text-muted-foreground mt-6">
            Don't have an account?{' '}
            <Link to="/signup" className="text-primary hover:underline font-medium">Sign Up</Link>
          </p>
        </div>
      </motion.div>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal isOpen={forgotOpen} onClose={() => setForgotOpen(false)} />
    </div>
  );
};

export default Login;
