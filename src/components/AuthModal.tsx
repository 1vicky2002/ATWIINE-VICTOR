import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { Mail, Lock, User as UserIcon, LogIn, UserPlus, X, AlertCircle, ArrowRight } from 'lucide-react';
import { FaGoogle, FaFacebook, FaXTwitter, FaLinkedin } from 'react-icons/fa6';
import { VoteTickIcon } from './CustomIcons';

export default function AuthModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [enteredOtp, setEnteredOtp] = useState("");
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [showOtpNotification, setShowOtpNotification] = useState(false);
  const { user, login, loginWithEmail, signupWithEmail, resetPassword, loginAnonymously } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isLogin) {
        await loginWithEmail(email, password);
      } else {
        await signupWithEmail(email, password, name);
      }
      onClose();
    } catch (err: any) {
      let message = "An unexpected error occurred.";
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        message = "Invalid email or password. Please try again.";
      } else if (err.code === 'auth/email-already-in-use') {
        message = "This email is already registered. Please sign in instead.";
      } else if (err.code === 'auth/weak-password') {
        message = "Password should be at least 6 characters.";
      } else if (err.message) {
        message = err.message;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'facebook' | 'twitter' | 'linkedin') => {
    setError("");
    try {
      await login(provider);
      onClose();
    } catch (err: any) {
      setError(err.message || "Social Sign-In failed.");
    }
  };

  const handleReset = async () => {
    if (!email) {
      setError("Please enter your email first.");
      return;
    }
    try {
      await resetPassword(email);
      alert("Password reset email sent!");
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-md rounded-2xl overflow-hidden shadow-2xl relative border border-slate-200"
      >
        <button onClick={onClose} className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
          <X size={20} />
        </button>

        <div className="p-8 md:p-12">
          <div className="text-center mb-10">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="inline-block p-4 bg-ug-red/5 rounded-3xl mb-6 border border-ug-red/10"
            >
              <img src="/favicon.ico" alt="Logo" className="w-12 h-12 shadow-xl" />
            </motion.div>
            <motion.h2 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl md:text-5xl font-display font-black tracking-tight text-slate-900 mb-2 italic uppercase"
            >
              {isLogin ? "Welcome Back" : "Register Now"}
            </motion.h2>
            <p className="text-slate-400 text-[9px] font-bold uppercase tracking-[0.4em]">
              {isLogin ? "Sign in to your account" : "Join the national digital democracy"}
            </p>
          </div>

          <AnimatePresence mode="wait">
            {!user ? (
              <motion.div
                key="social-auth-options"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mb-8 p-4 bg-ug-red/5 border border-ug-red/10 rounded-2xl flex items-start gap-3"
                  >
                    <AlertCircle className="text-ug-red flex-shrink-0 mt-0.5" size={16} />
                    <p className="text-[11px] font-bold text-ug-red leading-relaxed uppercase tracking-tight">{error}</p>
                  </motion.div>
                )}

                <motion.button 
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSocialLogin('google')}
                  className="w-full py-5 px-6 bg-white border border-slate-200 text-slate-700 rounded-2xl font-black text-xs uppercase tracking-widest shadow-sm hover:shadow-xl hover:border-ug-red/20 transition-all flex items-center gap-5 group"
                >
                  <div className="w-10 h-10 flex items-center justify-center bg-slate-50 rounded-xl group-hover:bg-ug-red/5 transition-colors">
                    <svg className="w-6 h-6" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  </div>
                  <span className="flex-grow text-left">Continue with Google</span>
                  <ArrowRight size={16} className="text-slate-300 group-hover:text-ug-red group-hover:translate-x-1 transition-all" />
                </motion.button>

                <motion.button 
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSocialLogin('facebook')}
                  className="w-full py-5 px-6 bg-[#1877F2] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-[0_10px_30px_rgba(24,119,242,0.3)] hover:shadow-[0_15px_40px_rgba(24,119,242,0.4)] transition-all flex items-center gap-5 group"
                >
                  <div className="w-10 h-10 flex items-center justify-center bg-white/20 rounded-xl">
                    <FaFacebook size={24} />
                  </div>
                  <span className="flex-grow text-left">Continue with Facebook</span>
                  <ArrowRight size={16} className="text-white/40 group-hover:text-white group-hover:translate-x-1 transition-all" />
                </motion.button>

                <motion.button 
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSocialLogin('twitter')}
                  className="w-full py-5 px-6 bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-[0_10px_30px_rgba(0,0,0,0.2)] hover:shadow-[0_15px_40px_rgba(0,0,0,0.3)] transition-all flex items-center gap-5 group border border-white/10"
                >
                  <div className="w-10 h-10 flex items-center justify-center bg-white/10 rounded-xl">
                    <FaXTwitter size={20} />
                  </div>
                  <span className="flex-grow text-left">Sign Up with X</span>
                  <ArrowRight size={16} className="text-white/40 group-hover:text-white group-hover:translate-x-1 transition-all" />
                </motion.button>

                {/* Voter Information Section */}
                {!isLogin && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-8 p-6 bg-slate-50 rounded-3xl border border-slate-100"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 rounded-full bg-ug-red text-white flex items-center justify-center">
                        <AlertCircle size={16} />
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-900">National ID Required Later</p>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-relaxed font-bold uppercase tracking-tight">
                      By signing up, you agree to follow the National Digital Voting guidelines. Verified accounts will gain access to premium voting registries.
                    </p>
                  </motion.div>
                )}

                <div className="mt-12 pt-8 border-t border-slate-100 text-center">
                  <button 
                    onClick={() => setIsLogin(!isLogin)}
                    className="group relative inline-flex flex-col items-center gap-2"
                  >
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 group-hover:text-ug-red transition-colors">
                      {isLogin ? "Need an account?" : "Already a member?"}
                    </span>
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-widest border-b-2 border-ug-red/20 group-hover:border-ug-red transition-all">
                      {isLogin ? "Join the Democracy" : "Log In Home"}
                    </span>
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="voter-success-state"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-10"
              >
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, ease: "anticipate" }}
                  className="w-24 h-24 bg-emerald-500 text-white rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-[0_20px_50px_rgba(16,185,129,0.3)]"
                >
                  <VoteTickIcon size={48} />
                </motion.div>
                <h3 className="text-3xl font-display font-black text-slate-900 uppercase italic mb-3">Identity Verified</h3>
                <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em] mb-10">Accessing Digital Registry...</p>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 1.5, ease: "easeInOut" }}
                    className="h-full bg-emerald-500"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
