import { motion, AnimatePresence } from 'framer-motion';
import {
    ShieldCheck, X, RotateCcw, AlertCircle, CheckCircle2, Loader2,
} from 'lucide-react';
import { useEffect, useRef, useState, useCallback } from 'react';

const OTP_LENGTH = 6;
const COUNTDOWN_SECONDS = 300; // 5 minutes

interface OtpModalProps {
    isOpen: boolean;
    email: string;
    purpose: 'signup' | 'password_reset';
    title?: string;
    description?: string;
    isVerifying: boolean;
    isSending: boolean;
    error: string | null;
    success: boolean;
    successMessage?: string;
    onVerify: (otp: string) => void;
    onResend: () => void;
    onClose: () => void;
}

const OtpModal = ({
    isOpen,
    email,
    title,
    description,
    isVerifying,
    isSending,
    error,
    success,
    successMessage,
    onVerify,
    onResend,
    onClose,
}: OtpModalProps) => {
    const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
    const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // ── Reset on open ─────────────────────────────────────────────────────────
    useEffect(() => {
        if (isOpen) {
            setDigits(Array(OTP_LENGTH).fill(''));
            setCountdown(COUNTDOWN_SECONDS);
            // Focus first input after animation
            setTimeout(() => inputRefs.current[0]?.focus(), 350);
        }
    }, [isOpen]);

    // ── Countdown timer ───────────────────────────────────────────────────────
    useEffect(() => {
        if (!isOpen) return;
        timerRef.current = setInterval(() => {
            setCountdown((c) => (c > 0 ? c - 1 : 0));
        }, 1000);
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [isOpen]);

    // Restart countdown when OTP is resent
    const handleResend = () => {
        setDigits(Array(OTP_LENGTH).fill(''));
        setCountdown(COUNTDOWN_SECONDS);
        inputRefs.current[0]?.focus();
        onResend();
    };

    const formatTime = (secs: number) => {
        const m = Math.floor(secs / 60).toString().padStart(2, '0');
        const s = (secs % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    // ── Input handling ────────────────────────────────────────────────────────
    const handleChange = useCallback(
        (index: number, value: string) => {
            // Allow only digits
            const digit = value.replace(/\D/g, '').slice(-1);
            const next = [...digits];
            next[index] = digit;
            setDigits(next);

            if (digit && index < OTP_LENGTH - 1) {
                inputRefs.current[index + 1]?.focus();
            }

            // Auto-submit when all 6 filled
            if (digit && index === OTP_LENGTH - 1) {
                const code = [...next].join('');
                if (code.length === OTP_LENGTH) onVerify(code);
            }
        },
        [digits, onVerify]
    );

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace') {
            if (digits[index]) {
                const next = [...digits];
                next[index] = '';
                setDigits(next);
            } else if (index > 0) {
                inputRefs.current[index - 1]?.focus();
            }
        } else if (e.key === 'ArrowLeft' && index > 0) {
            inputRefs.current[index - 1]?.focus();
        } else if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    // Handle paste across all inputs
    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
        if (!pasted) return;
        const next = Array(OTP_LENGTH).fill('');
        pasted.split('').forEach((ch, i) => { next[i] = ch; });
        setDigits(next);
        const lastFilledIdx = Math.min(pasted.length - 1, OTP_LENGTH - 1);
        inputRefs.current[lastFilledIdx]?.focus();
        if (pasted.length === OTP_LENGTH) onVerify(pasted);
    };

    const isExpired = countdown === 0;
    const otpValue = digits.join('');

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        key="backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    {/* Modal */}
                    <motion.div
                        key="modal"
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
                    >
                        <div className="glass-card-glow p-8 w-full max-w-md pointer-events-auto relative">
                            {/* Close button */}
                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-muted/50 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>

                            {/* Header */}
                            <div className="flex flex-col items-center mb-6">
                                <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center neon-glow mb-4">
                                    <ShieldCheck className="w-7 h-7 text-primary-foreground" />
                                </div>
                                <h2 className="text-xl font-display font-bold gradient-text">
                                    {title ?? 'Verify Your Email'}
                                </h2>
                                <p className="text-muted-foreground text-sm mt-1 text-center">
                                    {description ?? 'Enter the 6-digit code sent to'}
                                </p>
                                <p className="text-primary text-sm font-medium mt-0.5">{email}</p>
                            </div>

                            {/* Success state */}
                            <AnimatePresence mode="wait">
                                {success ? (
                                    <motion.div
                                        key="success"
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="flex flex-col items-center gap-3 py-4"
                                    >
                                        <CheckCircle2 className="w-14 h-14 text-green-400" />
                                        <p className="text-green-400 text-center font-medium">
                                            {successMessage ?? 'Verified successfully!'}
                                        </p>
                                    </motion.div>
                                ) : (
                                    <motion.div key="form">
                                        {/* Expired warning */}
                                        {isExpired && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="flex items-start gap-2 p-3 mb-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm"
                                            >
                                                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                                <span>OTP has expired. Please request a new one.</span>
                                            </motion.div>
                                        )}

                                        {/* Error */}
                                        {error && !isExpired && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="flex items-start gap-2 p-3 mb-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm"
                                            >
                                                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                                <span>{error}</span>
                                            </motion.div>
                                        )}

                                        {/* OTP Input boxes */}
                                        <div
                                            className="flex items-center justify-center gap-2 my-6"
                                            onPaste={handlePaste}
                                        >
                                            {digits.map((d, i) => (
                                                <input
                                                    key={i}
                                                    ref={(el) => { inputRefs.current[i] = el; }}
                                                    type="text"
                                                    inputMode="numeric"
                                                    maxLength={1}
                                                    value={d}
                                                    disabled={isVerifying || isExpired}
                                                    onChange={(e) => handleChange(i, e.target.value)}
                                                    onKeyDown={(e) => handleKeyDown(i, e)}
                                                    className={[
                                                        'w-11 h-13 text-center text-lg font-bold rounded-xl border transition-all',
                                                        'bg-muted/50 text-foreground',
                                                        'focus:outline-none focus:ring-2 focus:ring-primary/60 focus:border-primary/60',
                                                        d ? 'border-primary/50 shadow-[0_0_12px_rgba(139,92,246,0.25)]' : 'border-border',
                                                        (isVerifying || isExpired) ? 'opacity-50 cursor-not-allowed' : '',
                                                    ].join(' ')}
                                                    style={{ width: '2.75rem', height: '3.25rem' }}
                                                />
                                            ))}
                                        </div>

                                        {/* Timer + Resend */}
                                        <div className="flex items-center justify-between mb-5">
                                            <span className={`text-sm ${isExpired ? 'text-destructive' : 'text-muted-foreground'}`}>
                                                {isExpired ? 'Code expired' : `Expires in ${formatTime(countdown)}`}
                                            </span>
                                            <button
                                                type="button"
                                                disabled={!isExpired && !isSending ? false : isSending}
                                                onClick={handleResend}
                                                className={[
                                                    'text-sm flex items-center gap-1.5 transition-colors',
                                                    isSending
                                                        ? 'text-muted-foreground cursor-not-allowed'
                                                        : 'text-primary hover:underline cursor-pointer',
                                                ].join(' ')}
                                            >
                                                {isSending ? (
                                                    <><Loader2 className="w-3 h-3 animate-spin" /> Sending…</>
                                                ) : (
                                                    <><RotateCcw className="w-3 h-3" /> Resend OTP</>
                                                )}
                                            </button>
                                        </div>

                                        {/* Submit button */}
                                        <button
                                            type="button"
                                            disabled={otpValue.length < OTP_LENGTH || isVerifying || isExpired}
                                            onClick={() => onVerify(otpValue)}
                                            className="w-full h-11 rounded-xl gradient-primary text-primary-foreground font-semibold text-sm hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isVerifying ? (
                                                <><Loader2 className="w-4 h-4 animate-spin" /> Verifying…</>
                                            ) : (
                                                'Verify OTP'
                                            )}
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default OtpModal;
