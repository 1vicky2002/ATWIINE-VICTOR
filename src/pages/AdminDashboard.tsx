import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, onSnapshot, orderBy, addDoc, serverTimestamp, deleteDoc, doc, updateDoc, setDoc, writeBatch, getDocs, getDoc, increment } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, Edit2, Users, Calendar, Image as ImageIcon, Sparkles, Tag, Search, Filter, ChevronUp, ChevronDown, PieChart as PieChartIcon, Download, CheckCircle2, Clock, AlertCircle, X, MapPin, Zap, Loader2, FileSpreadsheet } from 'lucide-react';
import { AdminIcon, StatsIcon, VoteTickIcon, ViewsIcon } from '../components/CustomIcons';
import * as XLSX from 'xlsx';
import { uploadToImgBB, cn } from '../lib/utils';
import { generateCandidateBio, generateCandidateImage } from '../lib/gemini';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

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

export default function AdminDashboard() {
  const { isAdmin } = useAuth();
  const [polls, setPolls] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [showAddPoll, setShowAddPoll] = useState(false);
  const [newPoll, setNewPoll] = useState({
    title: "",
    description: "",
    category: "Presidential",
    location: "",
    endDate: "",
    bannerURL: "",
    status: "upcoming" as const,
    sponsors: [] as any[],
    isSpecial: false,
    requiredIdType: "Reg Number",
    dbIndex: 0
  });

  const [eligibleIdInput, setEligibleIdInput] = useState("");
  const [newPollEligibleIds, setNewPollEligibleIds] = useState<string[]>([]);
  const [uploadingEligible, setUploadingEligible] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState<{current: string, total: number, index: number} | null>(null);
  const [eligibleIds, setEligibleIds] = useState<any[]>([]);

  const [globalSponsors, setGlobalSponsors] = useState<any[]>([]);
  const [newSponsorName, setNewSponsorName] = useState("");
  const [newSponsorLogo, setNewSponsorLogo] = useState("");
  const [uploadingSponsor, setUploadingSponsor] = useState(false);
  const [activeTab, setActiveTab] = useState<'polls' | 'settings'>('polls');

  const [selectedPoll, setSelectedPoll] = useState<any>(null);
  const [targetDbIndex, setTargetDbIndex] = useState(0);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [newCandidate, setNewCandidate] = useState({
    name: "",
    slogan: "",
    bio: "",
    photoURL: "",
    position: 0
  });

  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showAddCandidate, setShowAddCandidate] = useState(false);
  const [loading, setLoading] = useState(false);

  const [generatingBio, setGeneratingBio] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);

  const categories = ["Presidential", "Parliamentary", "Local Government", "Youth Elections", "Women Councils", "Special Interest Groups"];

  useEffect(() => {
    if (!isAdmin) return;
    const q = query(collection(db, 'polls'), orderBy('createdAt', 'desc'));
    const unsubPolls = onSnapshot(q, (snapshot) => {
      setPolls(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'polls');
    });

    const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), (snap) => {
      if (snap.exists()) {
        setGlobalSponsors(snap.data().globalSponsors || []);
      }
    }, (error) => {
      console.warn("Settings listener failed", error);
    });

    return () => {
      unsubPolls();
      unsubSettings();
    };
  }, [isAdmin]);

  const filteredPolls = useMemo(() => {
    return polls.filter(poll => {
      const matchesSearch = poll.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = filterCategory === "All" || poll.category === filterCategory;
      const matchesStatus = filterStatus === "All" || poll.status === filterStatus;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [polls, searchQuery, filterCategory, filterStatus]);

  useEffect(() => {
    if (!selectedPoll?.id) return;
    const q = query(collection(db, `polls/${selectedPoll.id}/candidates`), orderBy('position', 'asc'));
    const unsubCandidates = onSnapshot(q, (snapshot) => {
      setCandidates(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `polls/${selectedPoll.id}/candidates`);
    });

    const unsubEligible = onSnapshot(collection(db, `polls/${selectedPoll.id}/eligibleIds`), (snapshot) => {
      setEligibleIds(snapshot.docs.map(d => d.id));
    });

    return () => {
      unsubCandidates();
      unsubEligible();
    };
  }, [selectedPoll]);

  const handleAddPoll = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("handleAddPoll Triggered with:", newPoll);
    
    if (!newPoll.title || !newPoll.endDate) {
      console.error("Missing required fields for poll creation");
      alert("Missing required fields. Title and End Date are mandatory.");
      return;
    }

    const slug = newPoll.title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
    console.log("Generated slug:", slug);
    
    try {
      setLoading(true);
      const pollCol = collection(db, 'polls');
      const pollRef = doc(pollCol);
      const pollId = pollRef.id;

      const pollData = {
        ...newPoll,
        slug,
        totalVotes: 0,
        createdAt: serverTimestamp(),
        endDate: new Date(newPoll.endDate),
        isPublished: false,
        isSpecial: newPoll.isSpecial || false,
        requiredIdType: newPoll.requiredIdType || "Reg Number"
      };
      
      await setDoc(doc(db, 'polls', pollId), pollData);
      
      const idsToUpload = newPollEligibleIds.length > 0 
        ? newPollEligibleIds 
        : eligibleIdInput.split(/[\n,]/).map(id => id.trim()).filter(id => id.length > 0);

      if (newPoll.isSpecial && idsToUpload.length > 0) {
        await handleBulkUploadIds(idsToUpload, pollId);
      }

      setShowAddPoll(false);
      setNewPoll({ title: "", description: "", category: "Presidential", location: "", endDate: "", bannerURL: "", status: "upcoming", sponsors: [] as any[], isSpecial: false, requiredIdType: "Reg Number", dbIndex: 0 });
      setEligibleIdInput("");
      setNewPollEligibleIds([]);
      alert("Executive Action: Poll Initialized.");
    } catch (error: any) {
      console.error("Poll Creation Failed:", error);
      alert(`Critical Error: System failed to initialize poll registry. ${error.message || 'Check connection or permissions.'}`);
      handleFirestoreError(error, OperationType.WRITE, 'polls');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkUploadIds = async (forcedIds?: string[], targetPollId?: string) => {
    const pollId = targetPollId || selectedPoll?.id;
    if (!pollId) return;
    
    const ids = forcedIds || eligibleIdInput.split(/[\n,]/).map(id => id.trim()).filter(id => id.length > 0);
    if (ids.length === 0) return;

    setUploadingEligible(true);
    setExtractionProgress({ current: ids[0], total: ids.length, index: 0 });
    
    try {
      const batchLimit = 500;
      for (let i = 0; i < ids.length; i += batchLimit) {
        const chunk = ids.slice(i, i + batchLimit);
        const batch = writeBatch(db);
        
        chunk.forEach((id) => {
          const safeId = id.replace(/\//g, '-');
          const docRef = doc(db, `polls/${pollId}/eligibleIds`, safeId);
          batch.set(docRef, {
            id: safeId,
            originalId: id,
            voted: false, 
            createdAt: serverTimestamp()
          }, { merge: true });
        });
        
        await batch.commit();
        setExtractionProgress(prev => prev ? { 
          ...prev, 
          current: chunk[chunk.length - 1], 
          index: Math.min(i + chunk.length, ids.length) 
        } : null);
      }
      
      setEligibleIdInput("");
      setNewPollEligibleIds([]);
      setExtractionProgress(null);
      if (!targetPollId) alert(`System Notification: Registry updated.`);
    } catch (error) {
      console.error("Bulk upload failed", error);
      if (!targetPollId) alert("Critical: Registry update failed.");
    } finally {
      setUploadingEligible(false);
      setExtractionProgress(null);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, isForNewPoll = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingEligible(true);
    const reader = new FileReader();

    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
        
        const extractedIds: string[] = [];
        const ignoredHeaders = ["REG NO", "ID", "NAME", "EMAIL", "PHONE", "STUDENT ID", "REG NUMBER", "IDENTIFIER", "VOTER ID", "VOTERS ID"];
        data.forEach(row => {
          row.forEach(cell => {
            if (cell && (typeof cell === 'string' || typeof cell === 'number')) {
              const val = cell.toString().trim();
              if (val.length >= 1 && !ignoredHeaders.includes(val.toUpperCase())) {
                extractedIds.push(val.toUpperCase());
              }
            }
          });
        });

        if (extractedIds.length > 0) {
          if (isForNewPoll) {
            setNewPollEligibleIds(extractedIds);
            alert(`${extractedIds.length} IDs extracted. They will be saved when you deploy the poll.`);
          } else {
            if (confirm(`Extracted ${extractedIds.length} potential IDs. Proceed to UPDATE the current poll registry with these entries?`)) {
              await handleBulkUploadIds(extractedIds);
            }
          }
        } else {
          alert("No IDs found in the file.");
        }
      } catch (err) {
        console.error("File processing error:", err);
      } finally {
        setUploadingEligible(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleUpdatePollStatus = async (pollId: string, status: 'active' | 'upcoming' | 'ended') => {
    try {
      const pollRef = doc(db, 'polls', pollId);
      await updateDoc(pollRef, { status });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `polls/${pollId}`);
    }
  };

  const handlePublishPoll = async (pollId: string) => {
    try {
      const pollRef = doc(db, 'polls', pollId);
      await updateDoc(pollRef, { 
        isPublished: true,
        status: 'active'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `polls/${pollId}`);
    }
  };

  const handleDeletePoll = async (poll: any) => {
    if (!confirm("Are you sure you want to delete this poll? This action is irreversible.")) return;
    
    try {
      const batch = writeBatch(db);
      const candSnap = await getDocs(collection(db, `polls/${poll.id}/candidates`));
      candSnap.forEach(cdoc => {
        batch.delete(doc(db, `polls/${poll.id}/candidates`, cdoc.id));
      });
      batch.delete(doc(db, 'polls', poll.id));
      await batch.commit();

      if (selectedPoll?.id === poll.id) setSelectedPoll(null);
      alert("Executive Order: Poll Purged.");
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `polls/${poll.id}`);
    }
  };

  const handleDeleteRegistry = async () => {
    if (!selectedPoll?.id) return;
    if (!confirm("Are you sure you want to PERMANENTLY CLEAR the entire eligible voter registry for this poll?")) return;

    setUploadingEligible(true);
    try {
      const snap = await getDocs(collection(db, `polls/${selectedPoll.id}/eligibleIds`));
      const batchLimit = 500;
      for (let i = 0; i < snap.docs.length; i += batchLimit) {
        const batch = writeBatch(db);
        const chunk = snap.docs.slice(i, i + batchLimit);
        chunk.forEach(d => batch.delete(d.ref));
        await batch.commit();
      }
      alert(`Executive Action: Registry purged.`);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `polls/${selectedPoll.id}/eligibleIds`);
    } finally {
      setUploadingEligible(false);
    }
  };

  const handleUpdateGlobalSponsors = async (newSponsors: any[]) => {
    const settingsDb = db;
    try {
      await updateDoc(doc(settingsDb, 'settings', 'global'), { globalSponsors: newSponsors });
    } catch (error: any) {
      if (error.code === 'not-found') {
        await setDoc(doc(settingsDb, 'settings', 'global'), { globalSponsors: newSponsors });
      } else {
        handleFirestoreError(error, OperationType.WRITE, 'settings/global');
      }
    }
  };

  const handleAddSponsorToPoll = async (name: string, logoURL: string, pollId?: string) => {
    if (pollId && selectedPoll) {
      try {
        const currentSponsors = selectedPoll?.sponsors || [];
        const updatedSponsors = [...currentSponsors, { name, logoURL }];
        await updateDoc(doc(db, 'polls', pollId), { sponsors: updatedSponsors });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `polls/${pollId}`);
      }
    } else {
      // Creation mode
      setNewPoll(prev => ({
        ...prev,
        sponsors: [...prev.sponsors, { name, logoURL }]
      }));
    }
  };

  const handleRemoveSponsorFromPoll = async (index: number, pollId?: string) => {
    if (pollId && selectedPoll) {
      try {
        const currentSponsors = selectedPoll?.sponsors || [];
        const updated = currentSponsors.filter((_: any, i: number) => i !== index);
        await updateDoc(doc(db, 'polls', pollId), { sponsors: updated });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `polls/${pollId}`);
      }
    } else {
      setNewPoll(prev => ({
        ...prev,
        sponsors: prev.sponsors.filter((_, i) => i !== index)
      }));
    }
  };

  const handleAddCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPoll?.id) return;
    
    setLoading(true);
    try {
      const candCol = collection(db, `polls/${selectedPoll.id}/candidates`);
      const candDoc = doc(candCol);
      const candId = candDoc.id;

      const candData = {
        ...newCandidate,
        voteCount: 0,
        viewCount: 0,
        position: candidates.length,
        createdAt: serverTimestamp()
      };

      await setDoc(doc(db, `polls/${selectedPoll.id}/candidates`, candId), candData);

      setNewCandidate({ name: "", slogan: "", bio: "", photoURL: "", position: 0 });
      setShowAddCandidate(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `polls/${selectedPoll.id}/candidates`);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCandidatePosition = async (candidateId: string, direction: 'up' | 'down') => {
    if (!selectedPoll?.id) return;
    const index = candidates.findIndex(c => c.id === candidateId);
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === candidates.length - 1) return;

    const otherIndex = direction === 'up' ? index - 1 : index + 1;
    const candidate = candidates[index];
    const otherCandidate = candidates[otherIndex];

    try {
      const c1Ref = doc(db, `polls/${selectedPoll.id}/candidates`, candidate.id);
      const c2Ref = doc(db, `polls/${selectedPoll.id}/candidates`, otherCandidate.id);
      await updateDoc(c1Ref, { position: otherCandidate.position });
      await updateDoc(c2Ref, { position: candidate.position });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `polls/${selectedPoll.id}/candidates`);
    }
  };

  const handleGenerateBio = async () => {
    if (!newCandidate.name || !newCandidate.slogan) return;
    setGeneratingBio(true);
    try {
      const bio = await generateCandidateBio(newCandidate.name, newCandidate.slogan);
      setNewCandidate(prev => ({ ...prev, bio: bio || "" }));
    } finally {
      setGeneratingBio(false);
    }
  };

  const handleImageUpload = async (file: File, type: 'banner' | 'photo') => {
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      if (type === 'banner') setUploadingBanner(true);
      else setUploadingPhoto(true);
      
      try {
        const url = await uploadToImgBB(base64);
        if (url) {
          if (type === 'banner') setNewPoll(prev => ({ ...prev, bannerURL: url }));
          else setNewCandidate(prev => ({ ...prev, photoURL: url }));
        }
      } finally {
        if (type === 'banner') setUploadingBanner(false);
        else setUploadingPhoto(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateImage = async () => {
    if (!newCandidate.name) return;
    setGeneratingImage(true);
    try {
      const prompt = `A professional political portrait of ${newCandidate.name}, a candidate in the Uganda elections. High quality, realistic, professional lighting.`;
      const imageUrl = await generateCandidateImage(prompt, "3:4");
      if (imageUrl) {
        const uploadedUrl = await uploadToImgBB(imageUrl);
        setNewCandidate(prev => ({ ...prev, photoURL: uploadedUrl || "" }));
      }
    } finally {
      setGeneratingImage(false);
    }
  };

  const chartData = candidates.map(c => ({
    name: c.name,
    votes: c.voteCount || 0,
    percentage: selectedPoll?.totalVotes ? ((c.voteCount || 0) / selectedPoll.totalVotes * 100).toFixed(1) : 0
  }));

  const COLORS = ['#D90000', '#FFD700', '#000000', '#4CAF50', '#2196F3', '#9C27B0'];

  if (!isAdmin) return <div className="p-12 text-center text-slate-900 font-display text-2xl italic">Access Denied</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-16 border-b border-slate-200 pb-10">
        <div>
          <div className="flex items-start gap-6">
            <div className="p-4 bg-slate-900 text-white rounded-3xl shadow-xl shadow-slate-900/20">
              <AdminIcon size={40} />
            </div>
            <div>
              <h1 className="text-6xl font-display font-bold tracking-tighter text-slate-900 leading-none mb-4 italic uppercase">Uganda Votes</h1>
              <p className="text-slate-400 font-mono text-xs uppercase tracking-[0.3em]">System Administration & Oversight • {new Date().getFullYear()}</p>
            </div>
          </div>
          
          <div className="flex gap-4 mt-8">
            <button 
              onClick={() => setActiveTab('polls')}
              className={cn(
                "px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all",
                activeTab === 'polls' ? "bg-slate-900 text-white" : "bg-white text-slate-400 border border-slate-200"
              )}
            >
              Polls
            </button>
            <button 
              onClick={() => setActiveTab('settings')}
              className={cn(
                "px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all",
                activeTab === 'settings' ? "bg-slate-900 text-white" : "bg-white text-slate-400 border border-slate-200"
              )}
            >
              Website Settings
            </button>
          </div>
        </div>
        
        {activeTab === 'polls' && (
          <button 
            onClick={() => setShowAddPoll(!showAddPoll)}
            className="group flex items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-full font-bold hover:scale-105 transition-all shadow-2xl active:scale-95"
          >
            <Plus size={20} className={cn("transition-transform duration-500", showAddPoll && "rotate-45")} />
            <span className="uppercase tracking-widest text-xs">{showAddPoll ? "Close Panel" : "Initialize New Poll"}</span>
          </button>
        )}
      </div>

      {activeTab === 'settings' && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-12 mb-20"
        >
          <div className="bg-white p-10 md:p-16 rounded-2xl border border-slate-200 shadow-xl">
            <h2 className="text-3xl font-display font-bold italic mb-8">Website Sponsors</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4">Sponsor Name</label>
                  <input 
                    type="text"
                    value={newSponsorName}
                    onChange={(e) => setNewSponsorName(e.target.value)}
                    className="w-full p-6 rounded-3xl border border-slate-100 bg-slate-50 outline-none focus:ring-2 ring-ug-yellow/20 transition-all font-display"
                    placeholder="Partner Name"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4">Logo</label>
                  <div className="relative group overflow-hidden rounded-3xl border-2 border-dashed border-slate-200 aspect-video flex items-center justify-center bg-slate-50">
                    {newSponsorLogo ? (
                      <img src={newSponsorLogo} className="w-full h-full object-contain p-8" />
                    ) : (
                      <div className="text-center">
                        <ImageIcon className="mx-auto mb-2 text-slate-300" size={32} />
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Logo (Ratio 2:1 Recommended)</p>
                      </div>
                    )}
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setUploadingSponsor(true);
                          const reader = new FileReader();
                          reader.onload = async (re) => {
                            const url = await uploadToImgBB(re.target?.result as string);
                            if (url) setNewSponsorLogo(url);
                            setUploadingSponsor(false);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    {uploadingSponsor && (
                      <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                        <Sparkles className="animate-spin text-ug-yellow" />
                      </div>
                    )}
                  </div>
                </div>
                <button 
                  onClick={() => {
                    if (newSponsorName && newSponsorLogo) {
                      const updated = [...globalSponsors, { name: newSponsorName, logoURL: newSponsorLogo }];
                      handleUpdateGlobalSponsors(updated);
                      setNewSponsorName("");
                      setNewSponsorLogo("");
                    }
                  }}
                  className="w-full py-6 bg-slate-900 text-white rounded-3xl font-black uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                  disabled={!newSponsorName || !newSponsorLogo || uploadingSponsor}
                >
                  Confirm Sponsor Add
                </button>
              </div>
              
              <div className="space-y-6">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4">Active Partners</label>
                <div className="grid grid-cols-1 gap-4">
                  {globalSponsors.map((sponsor, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl group hover:border-ug-yellow transition-all">
                      <div className="flex items-center gap-4">
                        <img src={sponsor.logoURL} className="w-12 h-6 object-contain" />
                        <span className="font-bold text-xs uppercase text-slate-600">{sponsor.name}</span>
                      </div>
                      <button 
                        onClick={() => {
                          const updated = globalSponsors.filter((_, i) => i !== idx);
                          handleUpdateGlobalSponsors(updated);
                        }}
                        className="p-2 text-slate-300 hover:text-ug-red hover:bg-ug-red/10 rounded-xl transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  {globalSponsors.length === 0 && (
                    <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-3xl">
                      <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest italic">Inventory Empty</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 p-10 md:p-16 rounded-[48px] text-white shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-ug-red/10 rounded-full blur-3xl -mr-32 -mt-32" />
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-white/10 rounded-2xl">
                  <Zap size={24} className="text-ug-yellow" />
                </div>
                <div>
                  <h2 className="text-3xl font-display font-black italic uppercase tracking-tighter">System Health</h2>
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Active Database Monitoring</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="p-8 bg-white/5 rounded-[32px] border border-white/10">
                  <h3 className="text-xs font-black uppercase tracking-widest mb-6 flex items-center gap-2">
                    <Clock size={14} className="text-ug-yellow" />
                    Database Connection
                  </h3>
                  <p className="text-[10px] text-white/60 mb-8 leading-relaxed uppercase font-medium">Primary database cluster is active and operational.</p>
                  <div className="flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 rounded-xl text-[10px] font-black uppercase tracking-widest">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    Online & Synchronized
                  </div>
                </div>

                <div className="p-8 bg-white/10 rounded-[32px] border border-white/20 border-dashed flex flex-col items-center justify-center text-center">
                  <AlertCircle size={32} className="text-white/20 mb-4" />
                  <h3 className="text-xs font-black uppercase tracking-widest mb-2">System Ops</h3>
                  <p className="text-[8px] text-white/40 uppercase tracking-widest leading-relaxed">Centralized architecture for all districts and regions.</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === 'polls' && (
        <>
          {showAddPoll && (
        <motion.form 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleAddPoll}
          className="bg-white p-10 md:p-16 rounded-[48px] border border-slate-200 shadow-2xl mb-20 relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-2 bg-ug-red" />
          
          <button 
            type="button"
            onClick={() => setShowAddPoll(false)}
            className="absolute top-8 right-8 p-3 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
          >
            <X size={24} />
          </button>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-8">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-4">Poll Identity</label>
                <input 
                  type="text" 
                  placeholder="Official Title" 
                  value={newPoll.title}
                  onChange={e => setNewPoll({...newPoll, title: e.target.value})}
                  className="w-full p-6 rounded-[24px] border border-slate-200 bg-slate-50 text-slate-900 outline-none focus:ring-2 ring-ug-red/20 transition-all font-display text-2xl"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-4">Objective & Context</label>
                <textarea 
                  placeholder="Detailed Description" 
                  value={newPoll.description}
                  onChange={e => setNewPoll({...newPoll, description: e.target.value})}
                  className="w-full p-6 rounded-[24px] border border-slate-200 bg-slate-50 text-slate-900 outline-none focus:ring-2 ring-ug-red/20 transition-all h-40 resize-none text-sm leading-relaxed"
                  required
                />
              </div>
            </div>
            <div className="space-y-8">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-4">Classification</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="Category" 
                      value={newPoll.category}
                      onChange={e => setNewPoll({...newPoll, category: e.target.value})}
                      className="w-full p-6 rounded-[24px] border border-slate-200 bg-slate-50 text-slate-900 outline-none focus:ring-2 ring-ug-red/20 transition-all text-sm"
                      required
                      list="category-suggestions"
                    />
                    <datalist id="category-suggestions">
                      {categories.map(c => <option key={c} value={c} />)}
                    </datalist>
                    <Tag size={16} className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-4">Location / Area</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="e.g. Kampala, Central Region" 
                      value={newPoll.location}
                      onChange={e => setNewPoll({...newPoll, location: e.target.value})}
                      className="w-full p-6 rounded-[24px] border border-slate-200 bg-slate-50 text-slate-900 outline-none focus:ring-2 ring-ug-red/20 transition-all text-sm"
                      required
                    />
                    <MapPin size={16} className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-4">Termination Date</label>
                <div className="relative">
                  <input 
                    type="datetime-local" 
                    value={newPoll.endDate}
                    onChange={e => setNewPoll({...newPoll, endDate: e.target.value})}
                    className="w-full p-6 rounded-[24px] border border-slate-200 bg-slate-50 text-slate-900 outline-none focus:ring-2 ring-ug-red/20 transition-all text-sm"
                    required
                  />
                  <Clock size={16} className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-4">Visual Asset (Banner)</label>
                <div className="flex gap-4">
                  <input 
                    type="text" 
                    placeholder="Image URL" 
                    value={newPoll.bannerURL}
                    onChange={e => setNewPoll({...newPoll, bannerURL: e.target.value})}
                    className="flex-grow p-6 rounded-[24px] border border-slate-200 bg-slate-50 text-slate-900 outline-none focus:ring-2 ring-ug-red/20 transition-all font-mono text-xs"
                  />
                  <label className="cursor-pointer p-6 bg-slate-900 text-white rounded-[24px] hover:scale-105 transition-all flex items-center justify-center shadow-xl active:scale-95">
                    <ImageIcon size={24} />
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*"
                      onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'banner')}
                    />
                  </label>
                </div>
                {uploadingBanner && <p className="text-[10px] font-bold text-ug-red uppercase tracking-widest animate-pulse ml-4">Uploading Asset...</p>}
              </div>
              {/* Deployment infrastructure */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-4">Deployment Infrastructure</label>
                <div className="flex flex-col md:flex-row md:items-center gap-4 p-4 bg-slate-50 border border-slate-100 rounded-3xl">
                  <div className="flex items-center gap-2 flex-grow">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Target Server (Project):</label>
                    <select 
                      value={newPoll.dbIndex}
                      onChange={e => setNewPoll({...newPoll, dbIndex: parseInt(e.target.value)})}
                      className="flex-grow p-2.5 rounded-xl bg-white border border-slate-200 text-[10px] font-bold uppercase ring-2 ring-ug-red/10 outline-none"
                    >
                      <option value={0}>Primary Cluster (ug-votes)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Poll Specific Configuration */}
              <div className="space-y-4 pt-4 border-t border-slate-100 mb-6">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-4">Special Poll Configuration</label>
                <div className="flex flex-col md:flex-row md:items-center gap-4 p-4 bg-slate-50 border border-slate-100 rounded-3xl">
                  <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl border border-slate-200">
                    <button 
                      type="button"
                      onClick={() => setNewPoll({...newPoll, isSpecial: !newPoll.isSpecial})}
                      className={cn(
                        "w-10 h-5 rounded-full transition-all relative",
                        newPoll.isSpecial ? "bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)]" : "bg-slate-300"
                      )}
                    >
                      <div className={cn(
                        "absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all shadow-sm",
                        newPoll.isSpecial ? "left-5.5" : "left-0.5"
                      )} />
                    </button>
                    <span className="text-[10px] font-bold text-slate-700 uppercase tracking-widest">Special Poll</span>
                  </div>
                  
                  {newPoll.isSpecial && (
                    <motion.div 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-2 flex-grow"
                    >
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">ID Type:</label>
                      <select 
                        value={newPoll.requiredIdType}
                        onChange={e => setNewPoll({...newPoll, requiredIdType: e.target.value})}
                        className="flex-grow p-2.5 rounded-xl bg-white border border-slate-200 text-[10px] font-bold uppercase"
                      >
                        <option>Voters Identifier</option>
                        <option>Voters ID</option>
                        <option>Voters Number</option>
                        <option>Voters Email</option>
                        <option>Voters Phone</option>
                        <option>Voters Name</option>
                        <option>Voters Code</option>
                        <option>Voters Token</option>
                        <option>National ID (NIN)</option>
                        <option>Reg Number</option>
                        <option>Student ID</option>
                        <option>Employee ID</option>
                      </select>
                    </motion.div>
                  )}
                </div>
                
                {newPoll.isSpecial && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 p-6 bg-slate-900 rounded-[32px] border border-white/5 shadow-2xl space-y-6"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center text-white">
                        <CheckCircle2 size={18} />
                      </div>
                      <h4 className="text-sm font-bold text-white uppercase tracking-widest">Setup Eligible Registry</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <label className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-1">Manual Entry</label>
                        <textarea 
                          value={eligibleIdInput}
                          onChange={(e) => setEligibleIdInput(e.target.value)}
                          placeholder={`Enter ${newPoll.requiredIdType || 'IDs'} (comma or new line separated)`}
                          className="w-full p-4 rounded-2xl border border-white/10 bg-white/5 text-[10px] font-mono h-32 outline-none focus:ring-1 ring-green-500/50 text-white placeholder:text-slate-600 shadow-inner"
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-1">Excel Extraction</label>
                        <div className="h-32 rounded-2xl border border-dashed border-white/10 bg-white/5 flex flex-col items-center justify-center p-4 relative group hover:border-green-500 transition-colors">
                          <FileSpreadsheet size={32} className="text-slate-600 group-hover:text-green-500 transition-colors mb-2" />
                          <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest text-center">Organize ID as "reg no" or in any cell</p>
                          <input 
                            type="file" 
                            className="absolute inset-0 opacity-0 cursor-pointer" 
                            accept=".xlsx, .xls, .csv"
                            onChange={(e) => handleFileUpload(e, true)}
                          />
                        </div>
                      </div>
                    </div>

                    {newPollEligibleIds.length > 0 && (
                      <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-xl">
                        <Sparkles size={12} className="text-green-500" />
                        <span className="text-[9px] font-bold text-green-500 uppercase tracking-widest">{newPollEligibleIds.length} IDs Loaded from File</span>
                        <button 
                          onClick={() => setNewPollEligibleIds([])}
                          className="ml-auto text-slate-500 hover:text-white"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-100 mb-6">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-4">Poll Sponsors (Optional)</label>
                <div className="flex flex-wrap gap-4 mb-4">
                  {newPoll.sponsors.map((s, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-100 rounded-xl group">
                      <img src={s.logoURL} className="h-4 object-contain" />
                      <span className="text-[8px] font-bold uppercase">{s.name}</span>
                      <button 
                        type="button" 
                        onClick={() => handleRemoveSponsorFromPoll(idx)}
                        className="text-slate-300 hover:text-ug-red"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-4">
                  <input 
                    type="text" 
                    placeholder="Sponsor Name" 
                    id="poll-sponsor-name"
                    className="flex-grow p-4 rounded-xl border border-slate-200 bg-white text-xs outline-none focus:ring-1 ring-ug-red/20"
                  />
                  <label className="cursor-pointer px-4 bg-slate-100 rounded-xl hover:bg-slate-200 transition-all flex items-center justify-center">
                    <ImageIcon size={16} className="text-slate-500" />
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        const nameInput = document.getElementById('poll-sponsor-name') as HTMLInputElement;
                        if (file && nameInput.value) {
                          const reader = new FileReader();
                          reader.onload = async (re) => {
                            const url = await uploadToImgBB(re.target?.result as string);
                            if (url) {
                              handleAddSponsorToPoll(nameInput.value, url);
                              nameInput.value = "";
                            }
                          };
                          reader.readAsDataURL(file);
                        } else if (!nameInput.value) {
                          alert("Please enter sponsor name first");
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
              <button type="submit" className="w-full py-6 bg-ug-red text-white rounded-[24px] font-bold text-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-2xl shadow-ug-red/20 uppercase tracking-widest">Deploy Poll</button>
            </div>
          </div>
        </motion.form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
        <div className="lg:col-span-4 space-y-8">
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-ug-red/10 flex items-center justify-center text-ug-red">
                <Calendar size={20} />
              </div>
              <h2 className="text-2xl font-display font-bold text-slate-900 italic">Active Registry</h2>
            </div>

            {/* Search & Filter */}
            <div className="space-y-4">
              <div className="relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search polls..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 bg-white text-slate-900 outline-none focus:ring-2 ring-ug-red/20 transition-all text-sm"
                />
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar no-scrollbar">
                <button 
                  onClick={() => setFilterCategory("All")}
                  className={cn(
                    "px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest whitespace-nowrap transition-all",
                    filterCategory === "All" ? "bg-ug-red text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  )}
                >
                  All
                </button>
                {categories.map(c => (
                  <button 
                    key={c}
                    onClick={() => setFilterCategory(c)}
                    className={cn(
                      "px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest whitespace-nowrap transition-all",
                      filterCategory === c ? "bg-ug-red text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar no-scrollbar">
                <button 
                  onClick={() => setFilterStatus("All")}
                  className={cn(
                    "px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest whitespace-nowrap transition-all",
                    filterStatus === "All" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  )}
                >
                  All Status
                </button>
                {['active', 'upcoming', 'ended'].map(s => (
                  <button 
                    key={s}
                    onClick={() => setFilterStatus(s)}
                    className={cn(
                      "px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest whitespace-nowrap transition-all",
                      filterStatus === s ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-4 custom-scrollbar">
            <AnimatePresence mode="popLayout">
              {filteredPolls.map((poll, idx) => (
                <motion.div 
                  key={poll.id} 
                  layoutId={poll.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => setSelectedPoll(poll)}
                  className={cn(
                    "p-6 rounded-[32px] border cursor-pointer transition-all duration-500 group",
                    selectedPoll?.id === poll.id 
                      ? "bg-slate-900 text-white border-transparent shadow-2xl scale-105" 
                      : "bg-white border-slate-200 hover:border-ug-red/50 text-slate-900"
                  )}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-display font-bold text-lg truncate pr-2 flex-grow">{poll.title}</h3>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePoll(poll);
                        }}
                        className="p-1.5 text-slate-300 hover:text-ug-red hover:bg-ug-red/10 rounded-lg transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        poll.isSpecial && "ring-4 ring-green-500/20",
                        poll.isSpecial ? "bg-green-500" : 
                        poll.status === 'active' ? "bg-green-500" : poll.status === 'ended' ? "bg-red-500" : "bg-yellow-500"
                      )} />
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-slate-500 font-mono text-[10px] uppercase tracking-[0.15em] font-bold">
                    <span className="bg-slate-100 px-2 py-0.5 rounded-md">{poll.category}</span>
                    {poll.isSpecial && <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-md">Special</span>}
                    <div className="flex items-center gap-1.5 text-slate-900">
                      <Users size={12} className="text-ug-yellow" />
                      <span>{poll.totalVotes || 0} Votes</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        <div className="lg:col-span-8">
          <AnimatePresence mode="wait">
            {selectedPoll ? (
              <motion.div 
                key={selectedPoll.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-12"
              >
                {/* Poll Status Control */}
                <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center",
                    selectedPoll.status === 'active' ? "bg-green-500/10 text-green-500" : 
                    selectedPoll.status === 'ended' ? "bg-red-500/10 text-red-500" : "bg-yellow-500/10 text-yellow-500"
                  )}>
                    {selectedPoll.status === 'active' ? <CheckCircle2 size={24} /> : 
                     selectedPoll.status === 'ended' ? <Clock size={24} /> : <AlertCircle size={24} />}
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-xl text-slate-900">{selectedPoll.title}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Current Status: {selectedPoll.status}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-2xl">
                  <button 
                    onClick={() => handleDeletePoll(selectedPoll.id)}
                    className="p-3 text-slate-300 hover:text-ug-red hover:bg-ug-red/10 rounded-xl transition-all"
                    title="Delete Poll"
                  >
                    <Trash2 size={16} />
                  </button>
                  <div className="w-px h-6 bg-slate-200 mx-2" />
                  {!selectedPoll.isPublished && (
                    <button
                      onClick={() => handlePublishPoll(selectedPoll.id)}
                      className="px-6 py-3 bg-ug-red text-white rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-xl hover:scale-105 active:scale-95 flex items-center gap-2"
                    >
                      <Zap size={14} className="fill-white" />
                      Publish to Live
                    </button>
                  )}
                  {(['active', 'upcoming', 'ended'] as const).map(status => (
                    <button
                      key={status}
                      onClick={() => handleUpdatePollStatus(selectedPoll.id, status)}
                      className={cn(
                        "px-6 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
                        selectedPoll.status === status 
                          ? "bg-slate-900 text-white shadow-lg" 
                          : "text-slate-400 hover:text-slate-900"
                      )}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              {/* Results Visualization */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="font-display font-bold text-xl text-slate-900 flex items-center gap-3">
                      <StatsIcon size={24} />
                      Vote Distribution
                    </h3>
                  </div>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888822" />
                        <XAxis dataKey="name" hide />
                        <YAxis hide />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', color: '#0f172a' }}
                        />
                        <Bar dataKey="votes" radius={[10, 10, 0, 0]}>
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="font-display font-bold text-xl text-slate-900 flex items-center gap-3">
                      <PieChartIcon size={20} className="text-ug-yellow" />
                      Percentage Share
                    </h3>
                  </div>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="votes"
                        >
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', color: '#0f172a' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Report Section (Only if ended) */}
              {selectedPoll.status === 'ended' && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-slate-900 text-white p-10 rounded-2xl shadow-2xl relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-8 opacity-10">
                    <StatsIcon size={200} />
                  </div>
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="px-3 py-1 bg-ug-red rounded-full text-[10px] font-bold uppercase tracking-widest text-white">Final Report</div>
                      <h3 className="text-3xl font-display font-bold italic">Poll Concluded</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
                      <div className="bg-white/10 p-6 rounded-2xl border border-white/20">
                        <p className="text-slate-300 text-[10px] font-bold uppercase tracking-widest mb-2">Total Turnout</p>
                        <p className="text-4xl font-display font-bold">{selectedPoll.totalVotes}</p>
                      </div>
                      <div className="bg-white/10 p-6 rounded-2xl border border-white/20">
                        <p className="text-slate-300 text-[10px] font-bold uppercase tracking-widest mb-2">Winner</p>
                        <p className="text-4xl font-display font-bold truncate">{[...chartData].sort((a,b) => (b.votes as number) - (a.votes as number))[0]?.name || "N/A"}</p>
                      </div>
                      <div className="bg-white/10 p-6 rounded-2xl border border-white/20">
                        <p className="text-slate-300 text-[10px] font-bold uppercase tracking-widest mb-2">Margin</p>
                        <p className="text-4xl font-display font-bold">
                          {chartData.length > 1 
                            ? (Number([...chartData].sort((a,b) => (b.votes as number) - (a.votes as number))[0].percentage) - Number([...chartData].sort((a,b) => (b.votes as number) - (a.votes as number))[1].percentage)).toFixed(1)
                            : "100"}%
                        </p>
                      </div>
                    </div>
                    <button className="flex items-center gap-3 px-8 py-4 bg-white text-slate-900 rounded-xl font-bold hover:scale-105 transition-all text-sm active:scale-95 shadow-xl">
                      <Download size={18} />
                      Export Certified Results
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Poll Sponsors Management */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-display font-bold text-xl text-slate-900 flex items-center gap-3">
                      <Zap size={20} className="text-ug-yellow" />
                      Program Sponsors
                    </h3>
                    <span className="text-slate-400 font-mono text-[9px] uppercase tracking-widest">{selectedPoll.sponsors?.length || 0} Partners</span>
                  </div>
                  
                  <div className="flex flex-wrap gap-3 mb-8">
                    {selectedPoll.sponsors?.map((s: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-100 rounded-2xl group relative">
                        <img src={s.logoURL} className="h-4 md:h-5 object-contain" />
                        <span className="text-[9px] font-bold uppercase truncate max-w-[80px]">{s.name}</span>
                        <button 
                          onClick={() => handleRemoveSponsorFromPoll(idx, selectedPoll.id)}
                          className="w-5 h-5 flex items-center justify-center bg-ug-red text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity absolute -top-1 -right-1 shadow-lg"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                    {(!selectedPoll.sponsors || selectedPoll.sponsors.length === 0) && (
                      <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest py-4">No sponsors attached</p>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-100">
                    <input 
                      type="text" 
                      placeholder="New Sponsor Name" 
                      id="edit-poll-sponsor-name"
                      className="flex-grow p-4 rounded-xl border border-slate-200 bg-white text-xs outline-none focus:ring-1 ring-ug-red/20 shadow-sm"
                    />
                    <label className="cursor-pointer px-6 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2 group shadow-lg active:scale-95">
                      <ImageIcon size={14} className="text-white/50 group-hover:text-white transition-colors" />
                      <span className="text-[9px] font-bold uppercase tracking-widest">Logo (Ratio 2:1)</span>
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          const nameInput = document.getElementById('edit-poll-sponsor-name') as HTMLInputElement;
                          if (file && nameInput.value) {
                            const reader = new FileReader();
                            reader.onload = async (re) => {
                              const url = await uploadToImgBB(re.target?.result as string);
                              if (url) {
                                handleAddSponsorToPoll(nameInput.value, url, selectedPoll.id);
                                nameInput.value = "";
                              }
                            };
                            reader.readAsDataURL(file);
                          } else if (!nameInput.value) {
                            alert("Please enter sponsor name first");
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>

                {/* Eligible IDs Management */}
                {selectedPoll.isSpecial && (
                  <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                          <CheckCircle2 size={24} className="text-green-500" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-display font-bold text-xl text-slate-900">Eligible Voters</h3>
                            <div className="flex items-center gap-2 px-2 py-0.5 bg-green-50 rounded-md border border-green-100">
                              <span className="text-[7px] font-black text-green-600 uppercase tracking-widest">{selectedPoll.requiredIdType || 'Reg Number'}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                             <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{eligibleIds.length} Verified IDs</p>
                             <button 
                               onClick={handleDeleteRegistry}
                               disabled={uploadingEligible}
                               className="text-[8px] font-bold text-ug-red uppercase hover:underline"
                             >
                               Clear Registry
                             </button>
                             <select 
                               value={selectedPoll.requiredIdType || "Reg Number"}
                               onChange={async (e) => {
                                 const newType = e.target.value;
                                 try {
                                   const pollRef = doc(db, 'polls', selectedPoll.id);
                                   await updateDoc(pollRef, { requiredIdType: newType });
                                 } catch (error) {
                                   console.error("Failed to update ID type", error);
                                 }
                               }}
                               className="text-[8px] font-bold uppercase bg-slate-50 border-none outline-none text-slate-500 hover:text-slate-900 cursor-pointer"
                             >
                                <option>Voters Identifier</option>
                                <option>Voters ID</option>
                                <option>Voters Number</option>
                                <option>Voters Email</option>
                                <option>Voters Phone</option>
                                <option>Voters Name</option>
                                <option>Voters Code</option>
                                <option>Voters Token</option>
                                <option>National ID (NIN)</option>
                                <option>Reg Number</option>
                                <option>Student ID</option>
                                <option>Employee ID</option>
                             </select>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-4">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Direct Entry</label>
                          <textarea 
                            value={eligibleIdInput}
                            onChange={(e) => setEligibleIdInput(e.target.value)}
                            placeholder={`Enter ${selectedPoll.requiredIdType || 'IDs'} one by one, separated by commas or enters...`}
                            className="w-full p-5 rounded-2xl border border-slate-200 bg-slate-50 text-[11px] font-mono h-40 outline-none focus:ring-2 ring-green-500/10 transition-all resize-none shadow-inner"
                          />
                          <button 
                            onClick={() => handleBulkUploadIds()}
                            disabled={uploadingEligible}
                            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold uppercase tracking-[0.2em] text-[10px] hover:bg-slate-800 transition-all flex items-center justify-center gap-3 shadow-xl active:scale-[0.98] disabled:opacity-50"
                          >
                            {uploadingEligible && !extractionProgress ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
                            Update & Sync Registry
                          </button>
                        </div>

                        <div className="space-y-4">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Import Spreadsheet</label>
                          <div className="h-40 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center p-6 relative group hover:border-green-500/40 transition-colors">
                            <FileSpreadsheet size={40} className="text-slate-300 group-hover:text-green-500/40 transition-colors mb-3" />
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Drop Excel/CSV or Click to Upload</p>
                            <input 
                              type="file" 
                              className="absolute inset-0 opacity-0 cursor-pointer" 
                              accept=".xlsx, .xls, .csv"
                              onChange={(e) => handleFileUpload(e, false)}
                              disabled={uploadingEligible}
                            />
                          </div>
                          <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                            <p className="text-[9px] text-blue-600 font-medium leading-relaxed italic">
                              * Our system will automatically extract all valid IDs from the uploaded file cells.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Progress Area - Ultra Compact */}
                      {extractionProgress && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="px-3 py-2 bg-slate-900 rounded-xl border border-white/10 shadow-lg overflow-hidden relative"
                        >
                          <div className="absolute top-0 left-0 h-0.5 bg-green-500 transition-all duration-300 shadow-[0_0_8px_rgba(34,197,94,0.5)]" style={{ width: `${(extractionProgress.index / extractionProgress.total) * 100}%` }} />
                          <div className="relative z-10 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Loader2 className="animate-spin text-green-500" size={12} />
                              <span className="text-[8px] font-black text-white uppercase tracking-widest italic truncate max-w-[150px]">
                                Indexing: {extractionProgress.current}
                              </span>
                            </div>
                            <span className="text-[9px] font-mono font-black text-green-500 italic">
                              {Math.round((extractionProgress.index / extractionProgress.total) * 100)}%
                            </span>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between border-b border-slate-200 pb-6">
                <h2 className="text-3xl font-display font-bold text-slate-900 italic flex items-center gap-4">
                  <Users size={28} className="text-ug-yellow" />
                  Candidate Roster
                </h2>
                <span className="text-slate-400 font-mono text-[10px] uppercase tracking-[0.2em]">{candidates.length} Registered</span>
              </div>

              <form onSubmit={handleAddCandidate} className="bg-white p-10 md:p-16 rounded-2xl border border-slate-200 shadow-2xl space-y-10 transition-all duration-500">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-8">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-4">Full Name</label>
                      <input 
                        type="text" 
                        placeholder="Official Name" 
                        value={newCandidate.name}
                        onChange={e => setNewCandidate({...newCandidate, name: e.target.value})}
                        className="w-full p-5 rounded-[20px] border border-slate-200 bg-slate-50 text-slate-900 outline-none focus:ring-2 ring-ug-yellow/20 transition-all"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-4">Campaign Slogan</label>
                      <input 
                        type="text" 
                        placeholder="Campaign Slogan" 
                        value={newCandidate.slogan}
                        onChange={e => setNewCandidate({...newCandidate, slogan: e.target.value})}
                        className="w-full p-5 rounded-[20px] border border-slate-200 bg-slate-50 text-slate-900 outline-none focus:ring-2 ring-ug-yellow/20 transition-all italic"
                        required
                      />
                    </div>
                    <div className="flex gap-4">
                      <button 
                        type="button"
                        onClick={handleGenerateBio}
                        disabled={generatingBio}
                        className="flex-grow flex items-center justify-center gap-3 px-6 py-4 bg-slate-50 rounded-[20px] text-[10px] font-bold uppercase tracking-widest hover:bg-slate-100 transition-all text-slate-900 border border-slate-200"
                      >
                        <Sparkles size={16} className="text-ug-red" />
                        {generatingBio ? "Processing..." : "AI Bio"}
                      </button>
                      <button 
                        type="button"
                        onClick={handleGenerateImage}
                        disabled={generatingImage}
                        className="flex-grow flex items-center justify-center gap-3 px-6 py-4 bg-slate-50 rounded-[20px] text-[10px] font-bold uppercase tracking-widest hover:bg-slate-100 transition-all text-slate-900 border border-slate-200"
                      >
                        <ImageIcon size={16} className="text-ug-yellow" />
                        {generatingImage ? "Processing..." : "AI Portrait"}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-8">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-4">Biography</label>
                      <textarea 
                        placeholder="Candidate Biography" 
                        value={newCandidate.bio}
                        onChange={e => setNewCandidate({...newCandidate, bio: e.target.value})}
                        className="w-full p-5 rounded-[20px] border border-slate-200 bg-slate-50 text-slate-900 outline-none focus:ring-2 ring-ug-yellow/20 transition-all h-32 resize-none text-sm leading-relaxed"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-4">Portrait Asset</label>
                      <div className="flex gap-4">
                        <input 
                          type="text" 
                          placeholder="Image URL" 
                          value={newCandidate.photoURL}
                          onChange={e => setNewCandidate({...newCandidate, photoURL: e.target.value})}
                          className="flex-grow p-5 rounded-[20px] border border-slate-200 bg-slate-50 text-slate-900 outline-none focus:ring-2 ring-ug-yellow/20 transition-all font-mono text-xs"
                          required
                        />
                        <label className="cursor-pointer p-5 bg-slate-900 text-white rounded-[20px] hover:scale-105 transition-all flex items-center justify-center shadow-xl active:scale-95">
                          <ImageIcon size={24} />
                          <input 
                            type="file" 
                            className="hidden" 
                            accept="image/*"
                            onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'photo')}
                          />
                        </label>
                      </div>
                      {uploadingPhoto && <p className="text-[10px] font-bold text-ug-yellow uppercase tracking-widest animate-pulse ml-4">Uploading Asset...</p>}
                    </div>
                  </div>
                </div>
                <button type="submit" className="w-full py-6 bg-slate-900 text-white rounded-[24px] font-bold text-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-2xl uppercase tracking-widest">Register Candidate</button>
              </form>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <AnimatePresence mode="popLayout">
                  {candidates.map((candidate, index) => (
                    <motion.div 
                      layout
                      key={candidate.id} 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="flex items-center gap-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-500 group"
                    >
                    <div className="flex flex-col gap-1 mr-2 items-center">
                        <button 
                          onClick={() => handleUpdateCandidatePosition(candidate.id, 'up')}
                          disabled={index === 0}
                          className="p-1 hover:bg-slate-100 rounded-md disabled:opacity-20 text-slate-900"
                        >
                          <ChevronUp size={16} />
                        </button>
                        <div className="text-[10px] font-black text-slate-300 uppercase tracking-tighter my-1">Pos {index + 1}</div>
                        <button 
                          onClick={() => handleUpdateCandidatePosition(candidate.id, 'down')}
                          disabled={index === candidates.length - 1}
                          className="p-1 hover:bg-slate-100 rounded-md disabled:opacity-20 text-slate-900"
                        >
                          <ChevronDown size={16} />
                        </button>
                      </div>
                      <div className="w-24 h-24 rounded-2xl overflow-hidden bg-slate-100 shadow-inner flex-shrink-0 border-2 border-slate-50">
                        <img src={candidate.photoURL} alt="" className="w-full h-full object-cover object-top group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                      </div>
                      <div className="flex-grow min-w-0">
                        <h4 className="font-display font-bold text-xl text-slate-900 truncate tracking-tight">{candidate.name}</h4>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black italic truncate">{candidate.slogan}</p>
                        <div className="flex items-center gap-6 mt-4">
                          <div className="flex flex-col bg-red-50 px-4 py-2 rounded-xl border border-red-100">
                            <span className="text-[7px] font-black text-red-400 uppercase tracking-widest mb-0.5">Verified Votes</span>
                            <div className="flex items-center gap-2">
                              <VoteTickIcon size={14} className="text-ug-red" />
                              <span className="text-lg font-display font-black text-ug-red italic tracking-tighter leading-none"><NumberTicker value={candidate.voteCount || 0} /></span>
                            </div>
                          </div>
                          <div className="flex flex-col bg-yellow-50 px-4 py-2 rounded-xl border border-yellow-100">
                            <span className="text-[7px] font-black text-yellow-600 uppercase tracking-widest mb-0.5">Views</span>
                            <div className="flex items-center gap-2">
                              <ViewsIcon size={14} className="text-ug-yellow" />
                              <span className="text-lg font-display font-black text-slate-900 italic tracking-tighter leading-none"><NumberTicker value={candidate.viewCount || 0} /></span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <button className="p-3 hover:bg-slate-900 hover:text-white rounded-full transition-all text-slate-400"><Edit2 size={16} /></button>
                        <button 
                          onClick={async () => {
                            if (!selectedPoll) return;
                            try {
                              const targetDb = db;
                              await deleteDoc(doc(targetDb, `polls/${selectedPoll.id}/candidates`, candidate.id));
                            } catch (error) {
                              handleFirestoreError(error, OperationType.DELETE, `polls/${selectedPoll.id}/candidates/${candidate.id}`);
                            }
                          }}
                          className="p-3 hover:bg-ug-red hover:text-white rounded-full transition-all text-gray-400 hover:text-white"
                        ><Trash2 size={16} /></button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-[600px] flex flex-col items-center justify-center text-slate-200 border-2 border-dashed border-slate-200 rounded-2xl"
            >
              <Calendar size={64} className="mb-6 opacity-20" />
              <p className="font-display text-2xl font-bold italic">Select a Registry to Manage</p>
            </motion.div>
          )}
        </AnimatePresence>
          </div>
        </div>
      </>
      )}
    </div>
  );
}
