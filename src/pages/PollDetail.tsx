import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { doc, collection, query, onSnapshot, orderBy, getDoc, addDoc, serverTimestamp, updateDoc, increment, runTransaction, setDoc, where, limit, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '../contexts/NavigationContext';
import { motion, AnimatePresence } from 'motion/react';
import { Timer, ChevronRight, Share2, PieChart as PieChartIcon, Award, CheckCircle2, Send, Zap, ArrowLeft, ChevronLeft, X, MapPin, Loader2, Globe, AlertCircle, RotateCw } from 'lucide-react';
import { VoteTickIcon, ChatIcon, StatsIcon, ViewsIcon, ProfileIcon } from '../components/CustomIcons';
import { cn, formatDate } from '../lib/utils';
import { FaWhatsapp, FaFacebook, FaXTwitter } from 'react-icons/fa6';
import Countdown from '../components/Countdown';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

import AuthModal from '../components/AuthModal';

const copyToClipboard = async (text: string) => {
  try {
    // Ensure we have focus
    window.focus();
    
    // Attempt modern API
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    console.error('Clipboard API failed, using fallback', err);
  }

  // Fallback: temporary textarea
  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    textArea.style.top = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error('Fallback copy failed', err);
    return false;
  }
};

function NumberTicker({ value, className }: { value: number, className?: string }) {
  const [displayValue, setDisplayValue] = useState(value);
  
  useEffect(() => {
    const startValue = displayValue;
    const endValue = value;
    if (startValue === endValue) return;
    
    const duration = 1000;
    const startTime = performance.now();
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function: easeOutExpo
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      
      const currentVal = Math.floor(startValue + (endValue - startValue) * easeProgress);
      setDisplayValue(currentVal);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [value]);

  return <span className={className}>{displayValue.toLocaleString()}</span>;
}

function CandidateModal({ poll, candidateId, onClose, initialCandidate }: { poll: any, candidateId: string, onClose: () => void, initialCandidate?: any }) {
  const { user, profile, login, logout, loading: authLoading } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const [candidate, setCandidate] = useState<any>(initialCandidate || null);
  const [boostVotes, setBoostVotes] = useState("50");
  
  const boostCost = useMemo(() => {
    const votes = parseInt(boostVotes) || 0;
    return (votes / 50).toFixed(2);
  }, [boostVotes]);

  const handleBoost = () => {
    const votes = parseInt(boostVotes) || 0;
    if (votes <= 0) return;
    const phoneNumber = "+256751026975"; // Admin contact requested
    const message = `I would like to boost ${votes} votes for ${candidate.name} in ${poll.title}. Total: $${boostCost}`;
    window.open(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`, '_blank');
  };

  // Sync candidate state if initialCandidate prop changes from parent's real-time listener
  useEffect(() => {
    if (initialCandidate) {
      setCandidate(initialCandidate);
      setLoading(false);
    }
  }, [initialCandidate]);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(!initialCandidate);
  const [voting, setVoting] = useState(false);
  const [votedToday, setVotedToday] = useState(false);
  const [showVoteSuccess, setShowVoteSuccess] = useState(false);
  const [showAlreadyVoted, setShowAlreadyVoted] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [showBio, setShowBio] = useState(false);
  const [specialId, setSpecialId] = useState("");
  const [showIdPrompt, setShowIdPrompt] = useState(false);
  const [idError, setIdError] = useState("");
  const [verifyingId, setVerifyingId] = useState(false);
  const [needsRegistration, setNeedsRegistration] = useState(false);

  useEffect(() => {
    if (!initialCandidate && poll?.id && candidateId) {
      const candRef = doc(db, `polls/${poll.id}/candidates`, candidateId);
      const unsubscribe = onSnapshot(candRef, (snap) => {
        if (snap.exists()) {
          setCandidate({ id: snap.id, ...snap.data() });
        }
        setLoading(false);
      }, (error) => {
        console.warn("Candidate listener failed");
        setLoading(false);
      });
      return () => unsubscribe();
    }
  }, [poll?.id, candidateId, initialCandidate]);

  useEffect(() => {
    if (!poll?.id) {
      setVotedToday(false);
      return;
    }

    // Instantly increment view count every time the modal is opened
    const candRef = doc(db, `polls/${poll.id}/candidates`, candidateId);
    updateDoc(candRef, { viewCount: increment(1) }).catch((err) => {
      console.warn("Failed to increment view count", err);
    });

    const commQ = query(collection(db, `polls/${poll.id}/comments`), where('candidateId', '==', candidateId), orderBy('createdAt', 'desc'), limit(50));
    const unsubscribeComm = onSnapshot(commQ, (commSnap) => {
      setComments(commSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      console.warn("Comments listener failed");
    });

    if (user && poll?.id) {
      const today = new Date().toISOString().split('T')[0];
      const dailyVoteId = `${today}_${user.uid}`;
      const dailyVoteRef = doc(db, `polls/${poll.id}/dailyVotes`, dailyVoteId);
      
      const checkVote = async () => {
        try {
          const snap = await getDoc(dailyVoteRef);
          setVotedToday(snap.exists());
        } catch (e) {
          console.warn("Check daily vote failed", e);
        }
      };
      
      checkVote();
    } else {
      setVotedToday(false);
    }

    return () => unsubscribeComm();
  }, [poll?.id, candidateId, user]);

  const [failedAttempts, setFailedAttempts] = useState(() => {
    const saved = localStorage.getItem(`failed_attempts_${poll?.id}`);
    return saved ? parseInt(saved) : 0;
  });
  const [lockoutTime, setLockoutTime] = useState(() => {
    const saved = localStorage.getItem(`lockout_${poll?.id}`);
    if (saved) {
      const remaining = Math.floor((parseInt(saved) - Date.now()) / 1000);
      return remaining > 0 ? remaining : 0;
    }
    return 0;
  });

  useEffect(() => {
    if (poll?.id) {
      localStorage.setItem(`failed_attempts_${poll?.id}`, failedAttempts.toString());
    }
  }, [failedAttempts, poll?.id]);

  useEffect(() => {
    let timer: any;
    if (lockoutTime > 0) {
      const expiration = Date.now() + lockoutTime * 1000;
      localStorage.setItem(`lockout_${poll?.id}`, expiration.toString());
      
      timer = setInterval(() => {
        setLockoutTime(prev => {
          if (prev <= 1) {
            localStorage.removeItem(`lockout_${poll?.id}`);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [lockoutTime, poll?.id]);

  const handleVote = async () => {
    if (isPollEnded || lockoutTime > 0) return;

    if (!user && !poll?.isSpecial) {
      setIsAuthModalOpen(true);
      return;
    }

    if (poll?.isSpecial && !showIdPrompt) {
      setShowIdPrompt(true);
      return;
    }

    if (poll?.isSpecial && !specialId) {
      setIdError(`Please enter your ${poll.requiredIdType || 'Identifier'} to vote.`);
      return;
    }

    setVoting(true);
    try {
      if (!poll?.id) return;

      const sanitizedSpecialId = specialId.trim().toUpperCase().replace(/\//g, '-');
      const dailyVoteId = poll.isSpecial ? `special_${sanitizedSpecialId}` : `${new Date().toISOString().split('T')[0]}_${user?.uid}`;
      
      const initialDailyVoteRef = doc(db, `polls/${poll.id}/dailyVotes`, dailyVoteId);
      const initialSnap = await getDoc(initialDailyVoteRef);
      if (initialSnap.exists()) {
        if (poll.isSpecial) {
          setIdError(`This ${poll.requiredIdType || 'ID'} has already voted in this poll.`);
          setVoting(false);
          return;
        }
        setVotedToday(true);
        throw new Error("Already voted today");
      }

      if (poll.isSpecial) {
        setVerifyingId(true);
        const eligibleRef = doc(db, `polls/${poll.id}/eligibleIds`, sanitizedSpecialId);
        const eligibleSnap = await getDoc(eligibleRef);
        setVerifyingId(false);
        
        if (!eligibleSnap.exists()) {
          const newFailedAttempts = failedAttempts + 1;
          setFailedAttempts(newFailedAttempts);
          
          if (newFailedAttempts >= 2) {
            setLockoutTime(30);
            setFailedAttempts(0);
            setIdError(`Multiple invalid attempts. System locked for security.`);
          } else {
            setIdError(`This ${poll.requiredIdType || 'Identifier'} is not found in the verified registry.`);
          }
          
          setVoting(false);
          return;
        }
        setFailedAttempts(0);
      }

      const voteId = poll.isSpecial ? `special_${sanitizedSpecialId}` : user?.uid;

      await runTransaction(db, async (transaction) => {
        const candRef = doc(db, `polls/${poll.id}/candidates`, candidateId);
        const pollRef = doc(db, 'polls', poll.id);
        const dvRef = doc(db, `polls/${poll.id}/dailyVotes`, dailyVoteId);
        const vRef = voteId ? doc(db, `polls/${poll.id}/votes`, voteId) : null;
        
        const candSnap = await transaction.get(candRef);
        const pollSnap = await transaction.get(pollRef);

        if (!pollSnap.exists() || !candSnap.exists()) return;

        if (user && !poll.isSpecial) {
          const uRef = doc(db, 'users', user.uid);
          const uSnap = await transaction.get(uRef);
          if (!uSnap.exists()) {
            transaction.set(uRef, {
              uid: user.uid,
              email: user.email,
              displayName: user.displayName || 'Voter',
              photoURL: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
              isAdmin: false,
              createdAt: serverTimestamp(),
              lastLogin: serverTimestamp(),
              banned: false
            });
          } else {
            transaction.update(uRef, { lastLogin: serverTimestamp() });
          }
        }

        transaction.update(candRef, { 
          voteCount: increment(1),
          updatedAt: serverTimestamp()
        });
        transaction.update(pollRef, { 
          totalVotes: increment(1),
          updatedAt: serverTimestamp()
        });

        const voterMetadata = {
          uid: user?.uid || null,
          email: poll.isSpecial ? "special-voter" : (user?.email || "anonymous"),
          name: poll.isSpecial ? `Voter ${specialId}` : (user?.displayName || "Anonymous Voter"),
          phone: poll.isSpecial ? null : (profile?.phone || null),
          candidateId: candidateId,
          votedAt: serverTimestamp(),
          isSpecial: poll.isSpecial || false,
          voterId: poll.isSpecial ? specialId : null
        };

        transaction.set(dvRef, voterMetadata);

        if (vRef) {
          transaction.set(vRef, voterMetadata);
        }
      });

      setVotedToday(true);
      setShowVoteSuccess(true);
      setShowIdPrompt(false);
    } catch (error: any) {
      console.error("Vote error:", error);
      if (error.message === "Already voted today") {
        setShowAlreadyVoted(true);
      } else {
        // Show alert and log error but don't throw to avoid crashing the whole view
        // unless it's a critical platform error we want to report.
        // We still report to console for the user's logs
        alert(`Voting Error: ${error.message || "Missing or insufficient permissions"}. Please try again later.`);
        // We still call this for internal platform tracking but we won't let it bubble if possible
        try {
          handleFirestoreError(error, OperationType.WRITE, `polls/${poll.id}/votes`);
        } catch (e) {
          // silenced after alert to prevent app crash
        }
      }
    } finally {
      setVoting(false);
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim() || !poll?.id) return;

    try {
      const commentRef = doc(collection(db, `polls/${poll.id}/comments`));
      await setDoc(commentRef, {
        candidateId,
        uid: user.uid,
        displayName: user.displayName,
        photoURL: user.photoURL,
        text: newComment,
        createdAt: serverTimestamp(),
        flagged: false,
        type: 'candidate'
      });
      setNewComment("");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `polls/${poll.id}/comments`);
    }
  };

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [onClose]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [candidateId]);

  const handleShareCandidate = async (platform?: string) => {
    if (!candidate) return;
    const url = `${window.location.origin}/?page=home&poll=${poll.slug}&candidate=${candidateId}`;
    const hashtags = "#UgandaVotes #DigitalDemocracy #PollsUganda #PearlOfAfrica";
    const text = `🗳️ Vote for ${candidate.name} in the ${poll.title} on Uganda Votes! Shaping the Pearl of Africa. \n\nCast your ballot here: ${url}\n\n${hashtags}`;

    if (platform === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    } else if (platform === 'facebook') {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
    } else if (platform === 'twitter') {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
    } else {
      let shared = false;
      if (navigator.share) {
        try {
          await navigator.share({
            title: `Vote for ${candidate.name}`,
            text: text,
            url: url,
          });
          shared = true;
        } catch (err) {
          console.log('Share canceled or failed');
        }
      }
      
      if (!shared) {
        const success = await copyToClipboard(url);
        if (success) {
          alert('Link copied to clipboard!');
        }
      }
    }
  };

  const isPollEnded = useMemo(() => {
    if (poll?.status === 'ended') return true;
    if (poll?.endDate?.seconds) {
      return new Date(poll.endDate.seconds * 1000) < new Date();
    }
    return false;
  }, [poll?.status, poll?.endDate]);

  if (loading) return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg bg-white rounded-2xl p-8 text-center shadow-2xl border border-slate-200"
      >
        <div className="w-12 h-12 border-4 border-ug-red/20 border-t-ug-red rounded-full animate-spin mx-auto mb-6" />
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">Initializing SECURE Profile...</p>
      </motion.div>
    </div>
  );

  if (!candidate) return null;

  return (
    <>
      <motion.div 
        ref={containerRef}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-start justify-center p-0 md:p-6 bg-slate-900/95 backdrop-blur-xl overflow-y-auto py-0 md:py-12"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div 
          initial={{ opacity: 0, scale: 0.98, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="bg-white/90 backdrop-blur-[40px] md:rounded-3xl border border-white shadow-[0_40px_100px_rgba(0,0,0,0.4)] overflow-y-auto md:overflow-hidden max-w-4xl w-full relative h-fit min-h-screen md:min-h-0 flex flex-col my-0 md:my-auto"
        >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 md:top-8 md:right-8 z-50 p-2 md:p-3 bg-slate-900 text-white hover:bg-ug-red transition-all shadow-2xl rounded-full group active:scale-90 flex items-center justify-center transition-all duration-300"
          title="Close Profile"
        >
          <X size={20} className="group-hover:rotate-90 transition-transform duration-300" />
        </button>

        <div className="flex flex-col flex-grow">
          <div className="w-full bg-slate-50 relative group overflow-hidden flex flex-col items-center justify-center p-6 md:p-12 border-b border-slate-100">
            <div className="w-full max-w-lg aspect-[4/5] md:aspect-[3/4] relative rounded-2xl overflow-hidden shadow-2xl border-4 border-white">
              <img 
                src={candidate.photoURL} 
                alt={candidate.name} 
                className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            </div>

            {/* Voting Section directly below picture */}
            <div className="w-full flex flex-col items-center mt-8 px-4 max-w-sm">
                {!isPollEnded && !votedToday && !needsRegistration && poll?.isSpecial && (
                   <motion.div 
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   className="w-full mb-4 space-y-3"
                 >
                   <input 
                     type="text" 
                     value={specialId}
                     onChange={(e) => {
                       setSpecialId(e.target.value.toUpperCase());
                       setIdError("");
                     }}
                     placeholder={`Enter ${poll.requiredIdType || 'Reg Number'}`}
                     className="w-full p-4 rounded-xl border border-slate-200 focus:ring-2 ring-ug-red/20 outline-none transition-all font-mono font-bold text-center text-lg shadow-inner bg-white"
                   />
                   {idError && <p className="text-[10px] font-bold text-ug-red uppercase mt-2 text-center animate-pulse">{idError}</p>}
                 </motion.div>
                )}

                {!needsRegistration && (
                  <button 
                    onClick={handleVote}
                    disabled={voting || (authLoading && !poll?.isSpecial) || isPollEnded}
                    className={cn(
                      "w-full py-3.5 rounded-xl font-bold text-[10px] transition-all uppercase tracking-[0.2em] flex items-center justify-center gap-3 relative overflow-hidden",
                      votedToday
                        ? "bg-slate-100 text-ug-red border border-ug-red shadow-none"
                        : "bg-ug-red text-white hover:bg-black hover:scale-[1.02] shadow-[0_15px_30px_rgba(217,0,0,0.2)] active:scale-95"
                    )}
                  >
                    {voting ? (
                      <Loader2 className="animate-spin" size={14} />
                    ) : votedToday ? (
                      <CheckCircle2 size={14} />
                    ) : (
                      <VoteTickIcon size={18} className="animate-pulse" />
                    )}
                    <span>{
                      voting ? "Processing..." : 
                      isPollEnded ? "Closed" : 
                      votedToday ? "Voted Successfully" : 
                      "Vote"
                    }</span>
                  </button>
                )}
            </div>
            
            <div className="mt-8 text-center w-full">
              <div className="flex items-center justify-center gap-2 px-3 py-1 bg-slate-900 rounded-full w-fit mx-auto mb-4 border border-white/20 shadow-lg">
                <div className="w-1.5 h-1.5 rounded-full bg-ug-yellow animate-pulse" />
                <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-white">Verified Official Contestant</span>
              </div>
              <h2 className="text-2xl md:text-5xl font-display font-black tracking-tighter text-slate-900 leading-tight uppercase mb-2 px-4 break-words">
                {candidate.name}
              </h2>
              <p className="text-sm md:text-base font-display font-bold text-slate-400 uppercase tracking-widest italic mb-6">
                {candidate.slogan || "Official National Candidate"}
              </p>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-2 md:gap-8 py-8 md:py-10 bg-slate-50/50 rounded-2xl md:rounded-[32px] border border-slate-100 shadow-inner max-w-2xl mx-auto w-full px-2">
                <div className="flex flex-col items-center">
                  <span className="text-[7px] md:text-[9px] font-black text-slate-800 uppercase tracking-[0.2em] mb-2 text-center whitespace-nowrap">Votes</span>
                  <div className="text-2xl md:text-7xl font-display font-black text-ug-red tracking-tighter transition-all">
                    <NumberTicker value={candidate.voteCount || 0} />
                  </div>
                  <div className="w-8 md:w-16 h-1 md:h-1.5 bg-ug-red rounded-full mt-2 md:mt-3 shadow-lg shadow-ug-red/20" />
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[7px] md:text-[9px] font-black text-slate-800 uppercase tracking-[0.2em] mb-2 text-center whitespace-nowrap">Views</span>
                  <div className="text-2xl md:text-7xl font-display font-black text-slate-900 tracking-tighter transition-all">
                    <NumberTicker value={candidate.viewCount || 0} />
                  </div>
                  <div className="w-8 md:w-16 h-1 md:h-1.5 bg-slate-900 rounded-full mt-2 md:mt-3 shadow-lg shadow-slate-900/10" />
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[7px] md:text-[9px] font-black text-slate-800 uppercase tracking-[0.2em] mb-2 text-center whitespace-nowrap">Position</span>
                  <div className="text-2xl md:text-7xl font-display font-black text-ug-yellow tracking-tighter drop-shadow-sm transition-all">
                    {poll?.totalVotes ? Math.round(((candidate.voteCount || 0) / poll.totalVotes) * 100) : 0}%
                  </div>
                  <div className="w-8 md:w-16 h-1 md:h-1.5 bg-ug-yellow rounded-full mt-2 md:mt-3 shadow-lg shadow-ug-yellow/20" />
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 md:p-12 bg-white flex flex-col items-center">
            {/* Share Panel - Smaller and same line */}
            <div className="flex flex-wrap items-center justify-center gap-2 mb-10 w-full">
              <button 
                onClick={() => handleShareCandidate()}
                className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-full text-[8px] font-bold uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95 shadow-xl"
              >
                <Share2 size={12} />
                Share Profile
              </button>
              <button 
                onClick={() => handleShareCandidate('whatsapp')}
                className="p-2 bg-[#25D366] text-white rounded-full hover:scale-110 transition-transform shadow-lg"
              >
                <FaWhatsapp size={14} />
              </button>
              <button 
                onClick={() => handleShareCandidate('facebook')}
                className="p-2 bg-[#1877F2] text-white rounded-full hover:scale-110 transition-transform shadow-lg"
              >
                <FaFacebook size={14} />
              </button>
              <button 
                onClick={() => handleShareCandidate('twitter')}
                className="p-2 bg-black text-white rounded-full hover:scale-110 transition-transform shadow-lg"
              >
                <FaXTwitter size={14} />
              </button>
            </div>

            <div className="max-w-2xl w-full text-center mb-12">
              <h4 className="text-[10px] font-bold text-slate-900 uppercase tracking-[0.3em] mb-4">Vision & Manifesto</h4>
              <p className="text-slate-600 text-sm md:text-base leading-relaxed italic font-medium bg-slate-50 p-8 rounded-2xl border border-slate-100">
                "{candidate.bio}"
              </p>
            </div>

            <div className="w-full flex flex-col items-center mb-16 px-4">
            </div>
          </div>
        </div>

        <div className="p-8 md:p-10 bg-slate-50 border-t border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-display font-bold tracking-tighter text-slate-900 italic flex items-center gap-3">
              <ChatIcon size={24} />
              Candidate Forum
            </h3>
            <span className="text-slate-400 font-mono text-[8px] uppercase tracking-[0.2em]">{comments.length} Comments</span>
          </div>

          {user ? (
            <form onSubmit={handleComment} className="mb-8">
              <div className="flex gap-4">
                <img src={user.photoURL!} alt="" className="w-8 h-8 rounded-full border border-slate-200" referrerPolicy="no-referrer" />
                <div className="flex-grow">
                  <textarea 
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Share your thoughts..."
                    maxLength={280}
                    className="w-full p-4 rounded-2xl border border-slate-200 bg-white text-slate-900 focus:border-ug-red focus:ring-1 focus:ring-ug-red outline-none transition-all resize-none h-20 text-sm"
                  />
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-[10px] text-slate-400">{newComment.length}/280</span>
                    <button 
                      type="submit"
                      disabled={!newComment.trim()}
                      className="px-6 py-2 bg-slate-900 text-white rounded-full text-xs font-bold hover:bg-slate-800 disabled:opacity-50 transition-all shadow-lg"
                    >
                      Post
                    </button>
                  </div>
                </div>
              </div>
            </form>
          ) : (
            <div className="p-6 bg-white rounded-2xl text-center mb-8 border border-slate-200">
              <p className="text-xs text-slate-500 mb-3">You must be signed in to comment.</p>
              <button 
                onClick={() => login()} 
                className="px-6 py-2 bg-slate-900 text-white rounded-full text-xs font-bold shadow-lg flex items-center gap-2"
              >
                <ProfileIcon size={14} />
                Sign In
              </button>
            </div>
          )}

          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-4 custom-scrollbar bg-slate-100/50 p-6 rounded-2xl border border-slate-200">
            {comments.map((comment, idx) => (
              <motion.div 
                key={comment.id} 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={cn(
                  "flex gap-3 max-w-[85%]",
                  comment.uid === user?.uid ? "ml-auto flex-row-reverse" : ""
                )}
              >
                <img src={comment.photoURL} alt="" className="w-8 h-8 rounded-full border border-white mt-1 shrink-0" referrerPolicy="no-referrer" />
                <div className={cn(
                  "flex flex-col",
                  comment.uid === user?.uid ? "items-end" : "items-start"
                )}>
                  <div className="flex items-center gap-2 mb-1 px-1">
                    <span className="font-bold text-[10px] text-slate-400 uppercase tracking-tighter">{comment.displayName}</span>
                    <span className="text-[10px] text-slate-400">• {formatDate(comment.createdAt?.seconds ? new Date(comment.createdAt.seconds * 1000) : null)}</span>
                  </div>
                  <div className={cn(
                    "px-4 py-3 rounded-2xl text-xs leading-relaxed shadow-sm border",
                    comment.uid === user?.uid 
                      ? "bg-slate-900 text-white border-slate-800 rounded-tr-sm" 
                      : "bg-white text-slate-700 border-slate-200 rounded-tl-sm"
                  )}>
                    {comment.text}
                  </div>
                </div>
              </motion.div>
            ))}
            {comments.length === 0 && (
              <div className="text-center py-10">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">No discussions yet. Be the first!</p>
              </div>
            )}
          </div>

          <div className="mt-12 pt-12 border-t border-slate-200 flex flex-col items-center">
            {poll?.sponsors && poll.sponsors.length > 0 && (
              <div className="mb-10 text-center w-full">
                <p className="text-[8px] font-bold text-slate-400 font-mono uppercase tracking-[0.4em] mb-6 italic">Verification Partners</p>
                <div className="flex flex-wrap justify-center items-center gap-8 md:gap-14">
                  {poll.sponsors.map((s: any, i: number) => (
                    <div key={i} className="flex flex-col items-center gap-3">
                      <img src={s.logoURL} alt={s.name} className="h-10 md:h-16 w-auto object-contain transition-all" />
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">{s.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <button 
              onClick={onClose}
              className="px-12 py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all active:scale-95 flex items-center gap-3 shadow-2xl uppercase tracking-widest text-[10px]"
            >
              <X size={18} />
              Return to Project
            </button>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {showVoteSuccess && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-[0_32px_64px_rgba(0,0,0,0.4)] border border-slate-100 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1.5 bg-ug-red" />
              
              <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-white shadow-xl">
                <CheckCircle2 size={40} className="text-green-500" />
              </div>

              <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Official Receipt</div>
              
              <p className="text-sm font-medium text-slate-600 mb-8 leading-relaxed">
                Voted <span className="text-slate-900 font-black uppercase italic">{candidate.name}</span> Successfully, 1 Vote(s) Added, 
                Total Votes Now Are <span className="text-ug-red font-black">{((candidate.voteCount || 0)).toLocaleString()}</span>, 
                {!poll?.isSpecial ? "You Can Vote Again Tomorrow, " : ""}Or 
                <button 
                  onClick={handleBoost}
                  className="inline-flex items-center gap-1 mx-1 text-ug-red font-black hover:underline group"
                >
                  <Zap size={10} className="fill-ug-red" />
                  Boost Contestant
                </button> Instead.
              </p>

              <div className="space-y-3">
                <button 
                  onClick={() => {
                    setShowVoteSuccess(false);
                    onClose();
                  }}
                  className="w-full py-4 bg-ug-red text-white rounded-2xl font-black shadow-[0_15px_30px_rgba(217,0,0,0.2)] hover:bg-black transition-all active:scale-95 uppercase text-xs tracking-[0.2em]"
                >
                  OK
                </button>
                
                <button 
                  onClick={handleBoost}
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black shadow-lg hover:bg-ug-red transition-all active:scale-95 uppercase text-xs tracking-[0.2em] flex items-center justify-center gap-2"
                >
                  <Zap size={14} className="fill-ug-yellow text-ug-yellow" />
                  Boost Now
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAlreadyVoted && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl border border-slate-200"
            >
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <VoteTickIcon size={32} />
              </div>
              <h3 className="text-xl font-bold tracking-tighter mb-2 text-slate-900 uppercase italic">
                {poll?.isSpecial ? "Already Participated" : "Participation Recorded"}
              </h3>
              <p className="text-sm text-slate-500 mb-8 leading-relaxed">
                This candidate currently has
                <br />
                <span className="text-slate-900 font-bold block mt-2 text-2xl font-mono">
                  {candidate.voteCount || 0} VOTES
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mt-1">Current Standing</span>
                <br />
                {poll?.isSpecial 
                  ? `Each ${poll.requiredIdType || 'ID'} is allowed exactly one entry in this official arena.`
                  : "You have already voted today."}
                {!poll?.isSpecial && (
                  <>
                    <br />
                    <span className="text-ug-red font-bold mt-2 block italic">You can vote again tomorrow.</span>
                  </>
                )}
              </p>
              <button 
                onClick={() => {
                  setShowAlreadyVoted(false);
                  onClose();
                }}
                className="w-full py-4 bg-black text-white rounded-2xl font-bold hover:bg-slate-800 transition-all active:scale-[0.98] shadow-xl uppercase text-[10px] tracking-widest italic"
              >
                Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
    <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </>
  );
}

export default function PollDetail({ slug, onBack }: { slug: string, onBack: () => void }) {
  const { user, login, loading: authLoading } = useAuth();
  const { navigateTo, selectedPollTitle, selectedCandidateId: urlCandidateId, updatePollTitle } = useNavigation();
  const [poll, setPoll] = useState<any>(null);
  const [allPolls, setAllPolls] = useState<any[]>([]);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    
    const findPoll = async () => {
      try {
        const pollQ = query(collection(db, 'polls'), where('slug', '==', slug), limit(1));
        const initialSnap = await getDocs(pollQ);
        
        if (!initialSnap.empty) {
          const pollDoc = initialSnap.docs[0];
          setPoll({ id: pollDoc.id, ...pollDoc.data() });
        } else {
          setPoll(null);
        }
      } catch (e) {
        console.error("Poll fetch failed", e);
      } finally {
        setLoading(false);
      }
    };

    findPoll();
  }, [slug]);

  // Real-time listener for current poll
  useEffect(() => {
    if (!poll?.id) return;
    const unsub = onSnapshot(doc(db, 'polls', poll.id), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setPoll((prev: any) => ({ ...prev, ...data }));
        if (data.title && data.title !== selectedPollTitle) {
          updatePollTitle(data.title);
        }
      }
    });

    const allPollsQ = query(collection(db, 'polls'), orderBy('createdAt', 'desc'), limit(20));
    const unsubscribeAll = onSnapshot(allPollsQ, (snapshot) => {
      setAllPolls(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      console.warn("Ticker polls listener failed");
    });

    return () => {
      unsub();
      unsubscribeAll();
    };
  }, [poll?.id]);

  useEffect(() => {
    if (!poll?.id) return;

    const candQ = query(collection(db, `polls/${poll.id}/candidates`), orderBy('position', 'asc'));
    const unsubscribeCand = onSnapshot(candQ, (candSnap) => {
      setCandidates(candSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `polls/${poll.id}/candidates`);
      setLoading(false);
    });

    const commQ = query(collection(db, `polls/${poll.id}/comments`), orderBy('createdAt', 'asc'));
    const unsubscribeComm = onSnapshot(commQ, (commSnap) => {
      setComments(commSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      console.warn("Main comments listener failed");
    });

    return () => {
      unsubscribeCand();
      unsubscribeComm();
    };
  }, [poll?.id]);

  const [tickerIndex, setTickerIndex] = useState(0);
  const otherPolls = useMemo(() => allPolls.filter(p => p.slug !== slug && p.status === 'active'), [allPolls, slug]);

  const tickerItems = useMemo(() => {
    const items = [
      ...otherPolls.map(p => ({ id: p.id, title: p.title, isBrand: false, slug: p.slug, bannerURL: p.bannerURL }))
    ];
    return items;
  }, [otherPolls]);

  const activeCandidate = useMemo(() => {
    if (!urlCandidateId || candidates.length === 0) return null;
    return candidates.find(c => c.id === urlCandidateId);
  }, [urlCandidateId, candidates]);

  useEffect(() => {
    if (tickerItems.length <= 1) return;
    const timer = setInterval(() => {
      setTickerIndex(prev => (prev + 1) % tickerItems.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [tickerItems.length]);

  useEffect(() => {
    // Only scroll if there are new comments and the component is already mounted
    // AND if the last comment was from the current user
    if (comments.length > 0 && !loading) {
      const lastComment = comments[0]; // ordered desc by createdAt
      if (lastComment.uid === user?.uid) {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [comments.length, user?.uid]);

  const candidatesRef = useRef<HTMLDivElement>(null);

  const chartData = useMemo(() => {
    const sorted = [...candidates].sort((a,b) => (b.voteCount || 0) - (a.voteCount || 0));
    return sorted.map(c => ({
      name: c.name,
      votes: c.voteCount || 0,
      percentage: poll?.totalVotes ? ((c.voteCount || 0) / poll.totalVotes * 100).toFixed(1) : 0
    }));
  }, [candidates, poll]);

  const COLORS = [
    '#D90000', '#FFD700', '#000000', '#4CAF50', '#2196F3', '#9C27B0', 
    '#FF9800', '#795548', '#607D8B', '#E91E63', '#00BCD4', '#8BC34A',
    '#FFC107', '#3F51B5', '#009688', '#FF5722', '#673AB7', '#CDDC39'
  ];

  const CustomTick = (props: any) => {
    const { x, y, payload } = props;
    const candidate = candidates.find(c => c.name === payload.value);
    if (!candidate) return <text x={x} y={y} dy={16} textAnchor="middle" fill="#666" fontSize={10}>{payload.value}</text>;
    
    return (
      <g transform={`translate(${x},${y + 10})`}>
        <defs>
          <clipPath id={`clip-${candidate.id}`}>
            <circle cx="0" cy="10" r="10" />
          </clipPath>
        </defs>
        <image
          x="-10"
          y="0"
          width="20"
          height="20"
          href={candidate.photoURL || `https://picsum.photos/seed/${candidate.id}/100/100`}
          clipPath={`url(#clip-${candidate.id})`}
          preserveAspectRatio="xMidYMid slice"
        />
        <text 
          x="0" 
          y="35" 
          textAnchor="middle" 
          fill="#64748b" 
          fontSize={7} 
          fontWeight="bold" 
          className="uppercase tracking-tighter"
          transform="rotate(-45, 0, 35)"
        >
          {candidate.name.split(' ')[0]}
        </text>
      </g>
    );
  };

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim() || sending) return;

    setSending(true);
    try {
      await addDoc(collection(db, `polls/${poll.id}/comments`), {
        text: newComment,
        uid: user.uid,
        displayName: user.displayName,
        photoURL: user.photoURL,
        createdAt: serverTimestamp(),
        type: 'general'
      });
      setNewComment("");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `polls/${poll.id}/comments`);
    } finally {
      setSending(false);
    }
  };

  const handleShare = async (platform?: string) => {
    const url = `${window.location.origin}/?page=home&poll=${poll.slug}`;
    const hashtags = "#UgandaVotes #NationalPolls #DigitalDemocracy #Uganda";
    const text = `📊 Participate in the ${poll.title} on Uganda Votes. Uganda's future depends on you! Join the national digital democracy here: ${url}\n\n${hashtags}`;

    if (platform === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    } else if (platform === 'facebook') {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
    } else if (platform === 'twitter') {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
    } else {
      let shared = false;
      if (navigator.share) {
        try {
          await navigator.share({
            title: poll.title,
            text: text,
            url: url,
          });
          shared = true;
        } catch (err) {
          console.log('Share canceled or failed');
        }
      }

      if (!shared) {
        const success = await copyToClipboard(url);
        if (success) {
          alert('Link copied to clipboard!');
        }
      }
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 py-12 space-y-12">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-display font-black tracking-tighter text-slate-200 italic uppercase leading-none animate-pulse">
            {selectedPollTitle || "Loading Poll..."}
          </h1>
          <div className="w-full max-w-2xl mx-auto aspect-video rounded-2xl bg-slate-50 animate-pulse mt-8" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] bg-slate-50 animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );

  if (!poll) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-ug-red/10 rounded-full flex items-center justify-center mx-auto mb-8 text-ug-red">
          <Timer size={40} />
        </div>
        <h1 className="text-4xl font-display font-bold tracking-tighter mb-4 text-slate-900 italic">Poll Not Found</h1>
        <p className="text-slate-500 mb-10 font-light">The registry you are looking for may have been archived or the link is incorrect.</p>
        <button 
          onClick={onBack}
          className="inline-flex items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-full font-bold hover:scale-105 transition-all shadow-2xl uppercase tracking-widest text-xs"
        >
          Return Home
        </button>
      </div>
    </div>
  );

  const targetDate = poll.endDate?.seconds ? new Date(poll.endDate.seconds * 1000).toISOString() : new Date().toISOString();
  const isEnded = poll.status === 'ended' || new Date(targetDate) < new Date();

  return (
    <div className="min-h-screen bg-slate-50/30">
      <Helmet>
        <title>{`${activeCandidate ? `${activeCandidate.name} | ${poll?.title}` : (poll?.title || selectedPollTitle || 'National Poll')} | Uganda Votes`}</title>
        <meta name="description" content={activeCandidate ? `${activeCandidate.name}: Official Candidate for ${poll?.title}. ${activeCandidate.bio?.slice(0, 160)}` : (poll?.description?.slice(0, 160) || 'Participate in Uganda\'s digital democracy. Vote in secure, transparent polls and make your voice heard.')} />
        <meta name="keywords" content={`Uganda, Elections, Voting, Polls, ${poll?.title}, ${poll?.category}, Democracy, Politics${activeCandidate ? `, ${activeCandidate.name}` : ''}`} />
        
        <meta property="og:title" content={`${activeCandidate ? activeCandidate.name : (poll?.title || selectedPollTitle || 'Poll')} | Uganda Votes`} />
        <meta property="og:description" content={activeCandidate ? `Vote for ${activeCandidate.name} in ${poll?.title}. Official Pearl of Africa choice.` : poll?.description} />
        <meta property="og:image" content={activeCandidate ? activeCandidate.photoURL : poll?.bannerURL || "https://images.unsplash.com/photo-1590402421685-822c23913b51?auto=format&fit=crop&q=80&w=1200"} />
        <meta property="og:url" content={window.location.href} />
        <meta property="og:type" content={activeCandidate ? "profile" : "article"} />
        
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${activeCandidate ? activeCandidate.name : (poll?.title || selectedPollTitle || 'Poll')} | Uganda Votes`} />
        <meta name="twitter:description" content={activeCandidate ? `Vote for ${activeCandidate.name} in ${poll?.title}. Support your candidate online.` : poll?.description} />
        <meta name="twitter:image" content={activeCandidate ? activeCandidate.photoURL : poll?.bannerURL || "https://images.unsplash.com/photo-1590402421685-822c23913b51?auto=format&fit=crop&q=80&w=1200"} />
        
        <link rel="canonical" href={window.location.href} />
        
        {poll && (
          <script type="application/ld+json">
            {JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Event",
              "name": poll.title,
              "description": poll.description,
              "image": poll.bannerURL,
              "startDate": poll.createdAt?.seconds ? new Date(poll.createdAt.seconds * 1000).toISOString() : undefined,
              "endDate": poll.endDate?.seconds ? new Date(poll.endDate.seconds * 1000).toISOString() : undefined,
              "location": {
                "@type": "Place",
                "name": "Uganda",
                "address": {
                  "@type": "PostalAddress",
                  "addressCountry": "UG"
                }
              },
              "organizer": {
                "@type": "Organization",
                "name": "Uganda Votes"
              }
            })}
          </script>
        )}
        
        {activeCandidate && (
          <script type="application/ld+json">
            {JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Person",
              "name": activeCandidate.name,
              "description": activeCandidate.bio,
              "image": activeCandidate.photoURL,
              "jobTitle": "Election Candidate",
              "worksFor": {
                "@type": "Organization",
                "name": "Uganda Votes"
              }
            })}
          </script>
        )}
      </Helmet>
      {/* Live Ticker Banner */}
      <div className="bg-slate-900 text-white py-1 overflow-hidden relative z-50 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 flex items-center gap-3">
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-[7px] font-bold uppercase tracking-[0.2em] text-white/30 italic pr-2 border-r border-white/10 uppercase">Up Next</span>
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={tickerIndex}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex-grow flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                {tickerItems[tickerIndex]?.bannerURL && (
                  <div className="w-6 h-4 rounded-[1px] overflow-hidden flex-shrink-0 border border-white/5 bg-slate-800">
                    <img src={tickerItems[tickerIndex].bannerURL} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
                <p className="text-[9px] font-bold truncate max-w-[150px] md:max-w-none text-slate-400 tracking-tight">
                  {tickerItems[tickerIndex]?.title}
                </p>
              </div>
              <button 
                onClick={() => {
                  const item = tickerItems[tickerIndex];
                  if (item.slug) navigateTo('home', item.slug, item.title);
                }}
                className="text-[8px] font-black uppercase tracking-tighter text-ug-yellow hover:text-white transition-all bg-white/5 px-1.5 py-0.5 rounded flex items-center gap-0.5"
              >
                GO <ChevronRight size={8} />
              </button>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-5xl mx-auto px-4 py-12"
      >
        <div className="mb-12 text-center">
          <div className="mb-10 inline-block">
            <h1 className="text-4xl md:text-6xl font-display font-black tracking-tighter text-slate-900 italic uppercase leading-none">
              {poll.title}
            </h1>
            <div className="flex items-center justify-center gap-4 mt-4">
              <div className="h-px w-8 bg-slate-900/10" />
              <p className="text-slate-500 font-mono text-[10px] uppercase tracking-[0.4em]">
                Official {poll.category || 'National'} Poll
              </p>
              <div className="h-px w-8 bg-slate-900/10" />
            </div>
          </div>

          <div className="w-full max-w-2xl mx-auto aspect-video rounded-2xl overflow-hidden shadow-2xl mb-8 border-4 border-white transform transition-transform hover:scale-[1.02] duration-700">
            <img 
              src={poll.bannerURL || `https://picsum.photos/seed/${poll.id}/1200/600`} 
              alt="" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>

          <div className="flex justify-center flex-wrap gap-2 mb-8">
            <button 
              onClick={() => handleShare()} 
              className="px-4 py-2 bg-slate-900 text-white rounded-full hover:bg-slate-800 transition-all flex items-center gap-2 shadow-xl active:scale-95"
            >
              <Share2 size={14} />
              <span className="text-[8px] font-bold uppercase tracking-widest">Share Poll</span>
            </button>
            <button 
              onClick={() => handleShare('whatsapp')}
              className="p-2 bg-white border border-[#25D366]/20 text-[#25D366] rounded-full hover:bg-[#25D366] hover:text-white transition-all shadow-md hover:shadow-xl active:scale-95"
              title="Share on WhatsApp"
            >
              <FaWhatsapp size={16} />
            </button>
            <button 
              onClick={() => handleShare('facebook')}
              className="p-2 bg-white border border-[#1877F2]/20 text-[#1877F2] rounded-full hover:bg-[#1877F2] hover:text-white transition-all shadow-md hover:shadow-xl active:scale-95"
              title="Share on Facebook"
            >
              <FaFacebook size={16} />
            </button>
            <button 
              onClick={() => handleShare('twitter')}
              className="p-2 bg-white border border-[#000000]/20 text-[#000000] rounded-full hover:bg-black hover:text-white transition-all shadow-md hover:shadow-xl active:scale-95"
              title="Share on X (Twitter)"
            >
              <FaXTwitter size={16} />
            </button>
          </div>

          {/* Screenshot-style Countdown Box */}
          <div className={cn(
            "border-2 rounded-xl p-8 bg-white shadow-sm mb-12",
            isEnded ? "border-slate-200" : "border-[#4CAF50]"
          )}>
            {isEnded ? (
              <div className="space-y-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Official Results Verified</p>
                <div className="text-4xl md:text-5xl font-display font-black text-ug-red italic uppercase tracking-tighter leading-none">POLL ENDED</div>
                <div className="flex items-center justify-center gap-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-4">
                  <span>Started: {new Date(poll.createdAt?.seconds * 1000).toLocaleDateString()}</span>
                  <span className="w-1 h-1 bg-slate-300 rounded-full" />
                  <span>Ended: {new Date(targetDate).toLocaleDateString()}</span>
                </div>
              </div>
            ) : (
              <>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-900 mb-4">
                  VOTING ENDS ON {targetDate ? new Date(targetDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).toUpperCase() : 'SOON'} AT {targetDate ? new Date(targetDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short' }) : 'MIDNIGHT'}
                </p>
                <Countdown targetDate={targetDate} className="text-[#D90000] font-display text-4xl font-bold" />
              </>
            )}
            
              {/* Removed ONE VOTE PER DAY as requested */}
              {!isEnded && (
                <div className="mt-6 space-y-2">
                  <p className="text-[10px] font-bold text-[#4CAF50] uppercase tracking-widest">CLICK ON PHOTO TO SUPPORT YOUR CHOICE</p>
                  <div className="flex justify-center gap-4 text-[10px] font-bold text-ug-yellow uppercase tracking-widest">
                  <button className="hover:underline">Contact Us</button>
                  <span>|</span>
                  <button className="hover:underline">How to Vote</button>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col items-center mb-8">
            <div className="inline-flex items-center gap-4 px-6 py-3 bg-slate-900 rounded-2xl shadow-[0_10px_30px_rgba(15,23,42,0.2)] border border-white/10 group overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-r from-ug-red/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
              <div className="flex flex-col items-center relative z-10">
                <span className="text-[7px] font-black text-slate-400 uppercase tracking-[0.4em] mb-0.5">Total Certified Votes</span>
                <div className="text-3xl font-display font-black text-white italic tracking-tighter flex items-center gap-2">
                <StatsIcon size={24} />
                <NumberTicker value={poll.totalVotes || 0} />
              </div>
            </div>
          </div>
          <div className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-3 italic flex items-center gap-2">
            TOTAL VOTES
          </div>
        </div>
        </div>

        {/* Leaderboard Summary for Ended Polls */}
        {isEnded && (
          <section className="mb-20">
            <div className="flex items-center gap-4 mb-10 border-b border-slate-200 pb-6">
              <h2 className="text-3xl font-display font-bold tracking-tighter text-slate-900 italic">Official Leaderboard</h2>
              <div className="flex items-center gap-2 px-3 py-1 bg-ug-red/10 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-ug-red animate-pulse" />
                <span className="text-[8px] font-bold uppercase tracking-widest text-ug-red">Certified Final</span>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-900 text-white border-b border-slate-800">
                      <th className="px-6 py-5 text-[9px] font-black uppercase tracking-[0.2em] font-mono">Profile</th>
                      <th className="px-6 py-5 text-[9px] font-black uppercase tracking-[0.2em] font-mono">Contestant</th>
                      <th className="px-6 py-5 text-[9px] font-black uppercase tracking-[0.2em] font-mono">Rank</th>
                      <th className="px-6 py-5 text-[9px] font-black uppercase tracking-[0.2em] font-mono text-center">Votes</th>
                      <th className="px-6 py-5 text-[9px] font-black uppercase tracking-[0.2em] font-mono text-center">Views</th>
                      <th className="px-6 py-5 text-[9px] font-black uppercase tracking-[0.2em] font-mono text-right">Position (100%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[...candidates].sort((a,b) => (b.voteCount || 0) - (a.voteCount || 0)).map((cand, i) => {
                      const perc = poll?.totalVotes ? ((cand.voteCount || 0) / poll.totalVotes * 100).toFixed(2) : "0";
                      const isWinner = i === 0;
                      return (
                        <tr key={cand.id} className={cn("hover:bg-slate-50 transition-colors group", isWinner && "bg-ug-yellow/5")}>
                          <td className="px-6 py-4">
                            <div className="relative w-12 h-12 md:w-16 md:h-16 rounded-xl overflow-hidden border-2 border-white shadow-lg">
                              <img src={cand.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              {isWinner && (
                                <div className="absolute top-0 right-0 p-1 bg-ug-yellow rounded-bl-lg">
                                  <Award size={10} className="text-black" />
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-black text-slate-900 uppercase tracking-tight group-hover:text-ug-red transition-colors">{cand.name}</span>
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic">{cand.slogan || 'Official Candidate'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "text-lg font-display font-black italic",
                                isWinner ? "text-ug-yellow" : "text-slate-900"
                              )}>#{i+1}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="text-sm font-mono font-black text-slate-900"><NumberTicker value={cand.voteCount || 0} /></span>
                          </td>
                          <td className="px-6 py-4 text-center text-slate-400 font-mono text-xs">
                            {cand.viewCount || 0}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex flex-col items-end gap-1.5 w-full">
                              <span className="text-xs font-black text-slate-900 italic">{perc}%</span>
                              <div className="w-24 md:w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200 shadow-inner">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  whileInView={{ width: `${perc}%` }}
                                  viewport={{ once: true }}
                                  transition={{ duration: 1.5, ease: "easeOut" }}
                                  className={cn("h-full", isWinner ? "bg-ug-yellow" : "bg-ug-red")}
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* Candidate Grid - Screenshot Style - Sorted by votes */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          {[...candidates].sort((a,b) => (b.voteCount || 0) - (a.voteCount || 0)).map((candidate, idx) => {
            const percentage = poll?.totalVotes ? ((candidate.voteCount || 0) / poll.totalVotes * 100).toFixed(1) : "0";
            return (
              <motion.div
                key={candidate.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => navigateTo('home', poll.slug, poll.title, candidate.id)}
                className="group cursor-pointer flex flex-col items-center bg-white/40 backdrop-blur-md p-3 rounded-[1.5rem] border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_60px_rgba(0,0,0,0.1)] hover:bg-white/60 transition-all duration-500"
              >
                <div className="w-full flex justify-between items-center mb-3 px-2">
                  <div className="flex flex-col items-start min-w-0">
                    <span className="text-[11px] font-black text-slate-950 uppercase tracking-tight truncate w-full group-hover:text-ug-red transition-colors">
                      {candidate.name}
                    </span>
                    <span className="text-[7px] font-bold text-slate-400 uppercase tracking-widest truncate w-full italic">
                      {candidate.slogan || 'Official Contestant'}
                    </span>
                  </div>
                </div>

                <div className={cn(
                  "relative aspect-[4/5] w-full rounded-xl overflow-hidden bg-slate-50 shadow-inner group-hover:shadow-2xl transition-all border-2",
                  idx === 0 ? "border-ug-yellow" : "border-[#4CAF50]/10"
                )}>
                  <img 
                    src={candidate.photoURL || `https://picsum.photos/seed/${candidate.id}/400/600`} 
                    alt={candidate.name}
                    className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-110"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-4 flex justify-between items-end">
                    <div className="flex flex-col">
                      <span className="text-[7px] font-black text-white/50 uppercase tracking-[0.2em] mb-0.5">Visits</span>
                      <div className="flex items-center gap-1.5 text-white/90">
                        <ViewsIcon size={12} />
                        <span className="text-[11px] font-mono font-black italic">{candidate.viewCount || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 w-full px-1">
                  <div className="flex items-center justify-between gap-2 p-3 bg-white/40 backdrop-blur-sm rounded-2xl border border-white/20 shadow-inner">
                    <div className="flex flex-col">
                      <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Votes</span>
                      <span className="text-lg font-display font-black text-ug-red tracking-tighter italic">
                        <NumberTicker value={candidate.voteCount || 0} />
                      </span>
                    </div>
                    <div className="h-8 w-px bg-slate-200/50 mx-1" />
                    <div className="flex flex-col items-end text-right">
                      <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Position</span>
                      <span className="text-lg font-display font-black text-slate-900 tracking-tighter italic">
                        {percentage}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 w-full flex gap-2">
                  <button 
                    onClick={() => navigateTo('home', poll.slug, poll.title, candidate.id)}
                    className="flex-grow py-2 bg-slate-950 text-white rounded-lg text-[9px] font-black uppercase tracking-[0.15em] hover:bg-ug-red transition-all active:scale-95 shadow-xl italic"
                  >
                    {isEnded ? "RESULTS" : (poll.isSpecial ? (
                      <div className="flex items-center justify-center gap-2">
                        <VoteTickIcon size={12} />
                        VOTE NOW
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <VoteTickIcon size={12} />
                        VOTE NOW
                      </div>
                    ))}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Insights Section */}
        <section className="mb-20 space-y-10">
          <div className="flex items-end justify-between border-b border-slate-200 pb-6">
            <div className="flex items-center gap-4">
              <h2 className="text-3xl font-display font-bold tracking-tighter text-slate-900 italic">Poll Analytics</h2>
              <div className="flex items-center gap-2 px-3 py-1 bg-ug-yellow/10 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-ug-yellow" />
                <span className="text-[8px] font-bold uppercase tracking-widest text-ug-yellow">Analyzed</span>
              </div>
            </div>
            <p className="text-slate-400 font-mono text-[10px] uppercase tracking-[0.2em]">Certified Data Stream</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Bar Chart */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="lg:col-span-8 bg-white p-8 rounded-[40px] border border-slate-200 shadow-xl relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-10 transition-opacity">
                <StatsIcon size={120} />
              </div>
              <h3 className="font-display font-bold text-3xl mb-8 text-slate-900 flex items-center gap-3 italic tracking-tighter">
                <StatsIcon size={28} />
                Live Feed Analytics
              </h3>
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ bottom: 80, top: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888811" />
                    <XAxis 
                      dataKey="name" 
                      interval={0} 
                      tick={<CustomTick />} 
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#0f172a', fontWeight: 'bold' }} />
                    <Tooltip 
                      cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', color: '#0f172a', fontSize: '14px', fontWeight: 'bold', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar 
                      dataKey="votes" 
                      barSize={32}
                      radius={[8, 8, 0, 0]} 
                      label={{ 
                        position: 'top', 
                        fill: '#ef4444', 
                        fontSize: 10, 
                        fontWeight: '900', 
                        formatter: (val: number) => `${val.toLocaleString()} (${chartData.find(d => d.votes === val)?.percentage}%)` 
                      }}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* Winner/Leader Card */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="lg:col-span-4 bg-slate-900 text-white p-8 rounded-[40px] shadow-2xl relative overflow-hidden flex flex-col justify-center"
            >
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <Award size={240} />
              </div>
              <div className="relative z-10">
                <h3 className="text-3xl font-display font-bold italic mb-8 flex items-center gap-3">
                  <Zap size={24} className="text-ug-yellow" />
                  {isEnded ? "Final Outcome" : "Current Leader"}
                </h3>
                <div className="space-y-8">
                  {[...chartData].sort((a,b) => (b.votes as number) - (a.votes as number)).slice(0, 1).map((leader, idx) => (
                    <div key={idx} className="flex items-center gap-6">
                      <div className="w-20 h-20 rounded-2xl overflow-hidden border-4 border-ug-yellow shadow-2xl flex-shrink-0">
                        <img 
                          src={candidates.find(c => c.name === leader.name)?.photoURL || `https://picsum.photos/seed/${leader.name}/200/200`} 
                          alt="" 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div>
                        <p className="text-ug-yellow text-[8px] font-bold uppercase tracking-[0.3em] mb-1">Majority Support</p>
                        <h4 className="text-3xl font-display font-bold truncate max-w-[200px]">{leader.name}</h4>
                        <p className="text-xl font-mono text-slate-400 mt-1">{leader.percentage}% Position</p>
                      </div>
                    </div>
                  ))}
                  <div className="grid grid-cols-2 gap-4 pt-8 border-t border-white/10">
                    <div>
                      <p className="text-slate-500 text-[8px] font-bold uppercase tracking-widest mb-1">Total Cast</p>
                      <p className="text-xl font-display font-bold">{poll.totalVotes}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-[8px] font-bold uppercase tracking-widest mb-1">Leading Margin</p>
                      <p className="text-xl font-display font-bold">
                        {chartData.length > 1 
                          ? (Number([...chartData].sort((a,b) => (b.votes as number) - (a.votes as number))[0].percentage) - Number([...chartData].sort((a,b) => (b.votes as number) - (a.votes as number))[1].percentage)).toFixed(1)
                          : "100"}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Post-Election Detailed Analysis - Only when ended */}
        {isEnded && (
          <motion.section 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-20"
          >
            <div className="bg-white rounded-[40px] border-2 border-slate-900 shadow-[20px_20px_0_0_rgba(15,23,42,1)] p-6 md:p-12 overflow-hidden relative">
              <div className="absolute -top-12 -right-12 w-64 h-64 bg-ug-yellow opacity-10 rounded-full blur-3xl" />
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-10 pb-6 border-b border-slate-100">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center">
                      <Award size={24} />
                    </div>
                    <div>
                      <h2 className="text-2xl md:text-3xl font-display font-bold tracking-tighter text-slate-900 uppercase">Final Rankings</h2>
                      <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">Certified Results Summary</p>
                    </div>
                  </div>
                  <div className="text-right hidden sm:block">
                    <p className="text-2xl font-display font-black text-slate-900">{poll.totalVotes?.toLocaleString()}</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest italic">Voters Participated</p>
                  </div>
                </div>

                <div className="overflow-x-auto -mx-6 md:-mx-0">
                  <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead>
                      <tr className="border-b border-slate-100 italic">
                        <th className="py-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Profiles</th>
                        <th className="py-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Contestants</th>
                        <th className="py-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Rank</th>
                        <th className="py-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono text-right">Votes</th>
                        <th className="py-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono text-right">Views</th>
                        <th className="py-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">P</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {[...candidates].sort((a,b) => (b.voteCount || 0) - (a.voteCount || 0)).map((candidate, idx) => {
                        const maxVotes = Math.max(...candidates.map(c => c.voteCount || 0));
                        const progress = maxVotes > 0 ? ((candidate.voteCount || 0) / maxVotes * 100) : 0;
                        const candidatePercentage = poll?.totalVotes ? ((candidate.voteCount || 0) / poll.totalVotes * 100).toFixed(1) : "0";
                        return (
                          <tr key={candidate.id} className="group hover:bg-slate-50/50 transition-colors">
                            <td className="py-4 px-6">
                              <div className="w-16 h-16 rounded-xl border-2 border-[#4CAF50] overflow-hidden shadow-sm group-hover:scale-105 transition-transform bg-white">
                                <img src={candidate.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              </div>
                            </td>
                            <td className="py-4 px-6">
                            <p className="font-display font-bold text-slate-900 text-lg leading-tight">{candidate.name}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1 italic">{candidate.slogan || 'Candidate'}</p>
                            </td>
                            <td className="py-4 px-6">
                              <span className={cn(
                                "font-display font-black text-xl italic",
                                idx === 0 ? "text-ug-yellow" : "text-slate-300"
                              )}>
                                #{idx + 1}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-right font-mono font-bold text-slate-900">
                              {(candidate.voteCount || 0).toLocaleString()}
                              <span className="text-[10px] text-slate-400 block">{candidatePercentage}%</span>
                            </td>
                            <td className="py-4 px-6 text-right font-mono text-slate-400 text-xs">
                              {(candidate.viewCount || 0).toLocaleString()}
                            </td>
                            <td className="py-4 px-6 min-w-[120px]">
                              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  whileInView={{ width: `${progress}%` }}
                                  transition={{ duration: 1, ease: "easeOut" }}
                                  className="h-full bg-blue-500 rounded-full"
                                />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="mt-12 p-10 bg-slate-900 text-white rounded-[32px] overflow-hidden relative group">
                  <div className="absolute top-0 right-0 w-full h-full opacity-10 bg-[radial-gradient(circle_at_top_right,var(--color-ug-yellow),transparent)]" />
                  <div className="relative z-10">
                    <h3 className="text-2xl font-display font-bold italic mb-6">Analyst's Final Word</h3>
                    <div className="space-y-4">
                      <p className="text-slate-400 text-lg font-light leading-relaxed">
                        {chartData.length > 0 ? (
                          <>
                            <span className="text-white font-bold">{[...chartData].sort((a,b) => (b.votes as number) - (a.votes as number))[0].name}</span> secured a 
                            <span className="text-ug-yellow font-black"> {Math.max(...chartData.map(d => Number(d.percentage)))}%</span> majority in this election. 
                            The community shown <span className="italic">{comments.length > 50 ? "intense engagement" : "steady participation"}</span> with 
                            <span className="text-white"> {comments.length} discussions</span> recorded in the polling forum.
                          </>
                        ) : "No participation data available to generate analysis."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.section>
        )}

        {/* Community Chat */}
        <div className="space-y-10">
          <div className="flex items-end justify-between border-b border-slate-200 pb-6">
            <h2 className="text-3xl font-display font-bold tracking-tighter text-slate-900 italic flex items-center gap-3">
              <ChatIcon size={24} />
              Community Chat
            </h2>
            <p className="text-slate-400 font-mono text-[10px] uppercase tracking-[0.2em]">Public Forum</p>
          </div>

          <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[600px]">
            {/* Chat Messages */}
            <div className="flex-grow overflow-y-auto p-8 space-y-8 custom-scrollbar bg-slate-50/50">
              <AnimatePresence mode="popLayout">
                {comments.length === 0 ? (
                  <motion.div 
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="h-full flex flex-col items-center justify-center text-center opacity-30"
                  >
                    <ChatIcon size={48} className="mb-4" />
                    <p className="font-display font-bold italic">No messages yet.<br/>Start the conversation!</p>
                  </motion.div>
                ) : (
                  comments.map((comment, idx) => (
                    <motion.div 
                      key={comment.id} 
                      initial={{ opacity: 0, x: -20, scale: 0.95 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: idx * 0.05 }}
                      className="flex gap-4 group relative"
                    >
                      {/* Thread line visual */}
                      <div className="absolute left-[15px] top-10 bottom-[-32px] w-[2px] bg-slate-200 group-last:hidden" />
                      
                      <div className="relative z-10 flex-shrink-0">
                        <img 
                          src={comment.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.uid}`} 
                          alt="" 
                          className="w-8 h-8 rounded-full border-2 border-white shadow-md flex-shrink-0" 
                          referrerPolicy="no-referrer" 
                        />
                        {comment.type === 'candidate' && (
                          <div className="absolute -bottom-1 -right-1 bg-ug-red rounded-full p-0.5 border border-white">
                            <CheckCircle2 size={8} className="text-white" />
                          </div>
                        )}
                      </div>
                      <div className="flex-grow min-w-0">
                        <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm group-hover:shadow-md transition-shadow">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-slate-900 truncate max-w-[150px]">{comment.displayName}</span>
                              {comment.type === 'candidate' && (
                                <span className="px-2 py-0.5 bg-ug-red/10 text-ug-red text-[8px] font-black uppercase tracking-widest rounded-full">Official</span>
                              )}
                            </div>
                            <span className="text-[9px] font-mono text-slate-400">{formatDate(comment.createdAt?.seconds ? new Date(comment.createdAt.seconds * 1000) : null)}</span>
                          </div>
                          <p className="text-slate-600 text-sm leading-relaxed break-words whitespace-pre-wrap">{comment.text}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input */}
            <div className="p-6 border-t border-slate-100 bg-slate-50/50">
              {user ? (
                <form onSubmit={handleSendComment} className="relative">
                  <input 
                    type="text" 
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Type your message..."
                    maxLength={200}
                    className="w-full pl-6 pr-14 py-4 rounded-2xl border border-slate-200 bg-white text-slate-900 focus:ring-2 ring-ug-red/20 outline-none transition-all text-xs"
                  />
                  <button 
                    type="submit"
                    disabled={!newComment.trim() || sending}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-slate-900 text-white rounded-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 shadow-lg"
                  >
                    <Send size={16} />
                  </button>
                </form>
              ) : (
                <div className="text-center py-2">
                  <p className="text-[10px] text-slate-500 mb-3 uppercase tracking-widest font-bold">Sign in to participate</p>
                  <button 
                    onClick={() => login()}
                    className="px-6 py-2 bg-slate-900 text-white rounded-full text-[10px] font-bold uppercase tracking-widest hover:scale-105 transition-all shadow-lg"
                  >
                    {isEnded ? "Sign In to Participate" : "Sign In to Vote"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Poll Specific Sponsors Footer */}
        {poll.sponsors && poll.sponsors.length > 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            className="mt-20 border-t border-slate-200 pt-10 pb-20 text-center"
          >
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.4em] mb-8 italic">Official Program Partners</p>
            <div className="flex flex-wrap justify-center items-center gap-10 md:gap-16">
              {poll.sponsors.map((s: any, i: number) => (
                <div key={i} className="flex flex-col items-center gap-3 group">
                  <img 
                    src={s.logoURL} 
                    alt={s.name} 
                    className="h-10 md:h-16 object-contain transition-all" 
                  />
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">
                    {s.name}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </motion.div>
      <AnimatePresence>
        {urlCandidateId && poll && candidates.some(c => c.id === urlCandidateId) && (
          <CandidateModal 
            poll={poll} 
            candidateId={urlCandidateId} 
            initialCandidate={candidates.find(c => c.id === urlCandidateId)}
            onClose={() => navigateTo('home', poll.slug, poll.title, null)} 
          />
        )}
      </AnimatePresence>

    </div>
  );
}
