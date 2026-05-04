import React, { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'motion/react';
import { Mail, Calendar, ShieldCheck, LogOut, Camera, Key, CheckCircle2, Loader2 } from 'lucide-react';
import { formatDate, uploadToImgBB } from '../lib/utils';
import { ProfileIcon } from '../components/CustomIcons';

export default function Profile() {
  const { user, profile, logout, resetPassword, updateUserProfile } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!user) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center">
      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <ProfileIcon size={40} className="text-gray-400" />
      </div>
      <h2 className="text-2xl font-bold mb-2">Not Signed In</h2>
      <p className="text-gray-500 mb-6">Please sign in to view and manage your profile.</p>
    </div>
  );

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        try {
          const url = await uploadToImgBB(base64);
          if (url) {
            await updateUserProfile({ photoURL: url });
          }
        } catch (error) {
          console.error("Profile update failed:", error);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setUploading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!user.email) return;
    try {
      await resetPassword(user.email);
      setResetSent(true);
      setTimeout(() => setResetSent(false), 5000);
    } catch (error) {
      console.error("Reset failed:", error);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto px-4 py-8 pb-32"
    >
      {/* Profile Header Card */}
      <div className="bg-white/40 backdrop-blur-xl rounded-[1.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] overflow-hidden mb-8 border border-white/60 transition-all duration-500">
        <div className="h-44 bg-gradient-to-br from-slate-900 via-ug-yellow to-ug-red relative">
          <div className="absolute inset-0 bg-white/5 backdrop-blur-[2px]" />
          <div className="absolute inset-0 bg-gradient-to-t from-white/20 to-transparent" />
        </div>
        <div className="px-8 pb-10">
          <div className="relative -mt-20 mb-8 flex justify-center">
            <div className="relative group">
              <div className="w-36 h-36 rounded-[1.5rem] border-8 border-white/60 shadow-2xl overflow-hidden bg-white/40 backdrop-blur-md">
                <img 
                  src={profile?.photoURL || user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} 
                  alt="" 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  referrerPolicy="no-referrer"
                />
                {uploading && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-sm">
                    <Loader2 className="text-white animate-spin" size={24} />
                  </div>
                )}
              </div>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 bg-slate-900 text-white p-3 rounded-2xl border-4 border-white shadow-2xl hover:scale-110 transition-all active:scale-95 z-10"
              >
                <Camera size={20} />
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageUpload} 
                accept="image/*" 
                className="hidden" 
              />
            </div>
          </div>
          
          <div className="text-center mb-10">
            <h1 className="text-4xl font-display font-black tracking-tighter mb-2 text-slate-900 uppercase italic">
              {profile?.displayName || user.displayName}
            </h1>
            <div className="flex items-center justify-center gap-2 text-slate-500 font-mono text-[10px] uppercase tracking-[0.2em] font-bold">
              <Mail size={12} className="text-ug-red" />
              <span>{user.email}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="p-6 bg-white/40 backdrop-blur-md rounded-2xl border border-white/60 shadow-inner group hover:bg-white/60 transition-all">
              <div className="flex items-center gap-2 text-slate-400 mb-2">
                <Calendar size={14} className="group-hover:text-ug-red transition-colors" />
                <span className="text-[9px] font-black uppercase tracking-[0.3em]">Registered</span>
              </div>
              <p className="text-sm font-bold text-slate-900 italic font-mono uppercase tracking-tighter">
                {formatDate(new Date(profile?.createdAt?.seconds * 1000 || Date.now()))}
              </p>
            </div>
            <div className="p-6 bg-white/40 backdrop-blur-md rounded-2xl border border-white/60 shadow-inner group hover:bg-white/60 transition-all">
              <div className="flex items-center gap-2 text-slate-400 mb-2">
                <ShieldCheck size={14} className="group-hover:text-ug-red transition-colors" />
                <span className="text-[9px] font-black uppercase tracking-[0.3em]">Status</span>
              </div>
              <p className="text-sm font-bold text-slate-900 italic font-mono uppercase tracking-tighter">
                {profile?.isAdmin ? "Administrator" : "Verified Voter"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Section */}
      <div className="space-y-6">
        <h3 className="px-8 text-[11px] font-black uppercase tracking-[0.4em] text-slate-400 italic">Core Utilities</h3>
        
        <div className="bg-white/30 backdrop-blur-xl rounded-[2.5rem] border border-white/40 overflow-hidden shadow-[0_15px_40px_rgba(0,0,0,0.03)] transition-all duration-500">
          <button 
            onClick={handlePasswordReset}
            disabled={resetSent}
            className="w-full flex items-center justify-between p-8 hover:bg-white/40 transition-all group"
          >
            <div className="flex items-center gap-6">
              <div className="w-14 h-14 bg-white/50 rounded-2xl flex items-center justify-center text-slate-900 shadow-sm group-hover:scale-110 transition-transform border border-white">
                <Key size={24} />
              </div>
              <div className="text-left">
                <p className="font-display font-bold text-slate-900 uppercase tracking-tighter text-lg leading-none mb-1">Secure Update</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Send reset link to verified email</p>
              </div>
            </div>
            {resetSent ? (
              <CheckCircle2 className="text-emerald-500" size={24} />
            ) : (
              <div className="w-10 h-10 rounded-full bg-white/50 flex items-center justify-center text-slate-400 group-hover:translate-x-1 transition-all shadow-sm border border-white">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
              </div>
            )}
          </button>

          <div className="h-px bg-white/40 mx-8" />

          <button 
            onClick={logout}
            className="w-full flex items-center justify-between p-8 hover:bg-ug-red/5 transition-all group"
          >
            <div className="flex items-center gap-6">
              <div className="w-14 h-14 bg-ug-red/5 rounded-2xl flex items-center justify-center text-ug-red shadow-sm group-hover:scale-110 transition-transform border border-ug-red/10">
                <LogOut size={24} />
              </div>
              <div className="text-left">
                <p className="font-display font-bold text-ug-red uppercase tracking-tighter text-lg leading-none mb-1">Terminate Session</p>
                <p className="text-[10px] font-bold text-ug-red/40 uppercase tracking-widest italic">Securely disconnect registry account</p>
              </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-ug-red/5 flex items-center justify-center text-ug-red shadow-sm group-hover:translate-x-1 transition-all border border-ug-red/10">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </div>
          </button>
        </div>
      </div>

      {resetSent && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl flex items-center gap-3 text-emerald-700 dark:text-emerald-400 text-sm font-medium"
        >
          <CheckCircle2 size={18} />
          <span>Password reset email has been sent to your inbox.</span>
        </motion.div>
      )}
    </motion.div>
  );
}
