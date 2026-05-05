import { useState, useEffect, useRef, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { collection, query, where, onSnapshot, orderBy, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useNavigation } from '../contexts/NavigationContext';
import { motion, AnimatePresence } from 'motion/react';
import { Timer, Users, ArrowRight, CheckCircle2, TrendingUp, Search, MapPin, Globe, Zap, ChevronRight, Loader2, X, Activity, Share2, Trophy, ChevronDown, Award, CheckSquare, Star } from 'lucide-react';
import { FaFacebook, FaXTwitter } from 'react-icons/fa6';
import { cn } from '../lib/utils';
import Countdown from '../components/Countdown';
import { StatsIcon, VoteTickIcon } from '../components/CustomIcons';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, CartesianGrid } from 'recharts';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet marker icon issue
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const GOOGLE_MAPS_API_KEY = (import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY || (process.env as any).GOOGLE_MAPS_PLATFORM_KEY || '';

const centers = [
  { name: "Kampala", lat: 0.3476, lng: 32.5825 },
  { name: "London", lat: 51.5074, lng: -0.1278 },
  { name: "Washington", lat: 38.9072, lng: -77.0369 },
  { name: "Dubai", lat: 25.2048, lng: 55.2708 },
  { name: "Nairobi", lat: -1.2921, lng: 36.8219 },
  { name: "Johannesburg", lat: -26.2041, lng: 28.0473 },
];

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

export default function Home() {
  const [polls, setPolls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [topPoll, setTopPoll] = useState<any>(null);
  const [topPollWinner, setTopPollWinner] = useState<any>(null);
  const [topPollCandidates, setTopPollCandidates] = useState<any[]>([]);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const { currentPage, navigateTo } = useNavigation();
  const currentYear = new Date().getFullYear();
  const pollsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentPage === 'polls' && !loading) {
      scrollToPolls();
    }
  }, [currentPage, loading]);

  const scrollToPolls = () => {
    pollsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  useEffect(() => {
    const q = query(collection(db, 'polls'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const pollsData = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }));
      setPolls(pollsData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'polls');
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (polls.length === 0) return;
    
    // Find poll with most votes
    const top = [...polls].sort((a, b) => (b.totalVotes || 0) - (a.totalVotes || 0))[0];
    if (top && top.id !== topPoll?.id) {
      setTopPoll(top);
      // Fetch winner and all candidates for this top poll
      const fetchData = async () => {
        try {
          const candSnap = await getDocs(query(collection(db, `polls/${top.id}/candidates`), orderBy('voteCount', 'desc')));
          if (!candSnap.empty) {
            const candidates = candSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setTopPollCandidates(candidates);
            setTopPollWinner(candidates[0]);
          }
        } catch (error) {
          console.error("Error fetching top poll data:", error);
        }
      };
      fetchData();
    }
  }, [polls]);

  const [currentSlide, setCurrentSlide] = useState(0);
  const heroImage = useMemo(() => {
    const activeOnly = polls.filter(p => {
      const targetDate = p.endDate?.seconds ? new Date(p.endDate.seconds * 1000) : new Date();
      return p.status === 'active' && targetDate >= new Date();
    });
    const p = activeOnly[currentSlide % (activeOnly.length || 1)];
    return p?.bannerURL || "https://ugandavotes.netlify.app/favicon.ico";
  }, [polls, currentSlide]);

  useEffect(() => {
    const activeOnly = polls.filter(p => {
      const targetDate = p.endDate?.seconds ? new Date(p.endDate.seconds * 1000) : new Date();
      return p.status === 'active' && targetDate >= new Date();
    });
    if (activeOnly.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % activeOnly.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [polls]);

  const filteredPolls = useMemo(() => {
    return polls.filter(poll => {
      const matchesSearch = poll.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           poll.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesLocation = !locationQuery || 
                             (poll.location && poll.location.toLowerCase().includes(locationQuery.toLowerCase()));
      return matchesSearch && matchesLocation;
    });
  }, [polls, searchQuery, locationQuery]);

  const { activePolls, archivedPolls } = useMemo(() => {
    const publishedOnly = filteredPolls.filter(p => p.isPublished !== false);
    const active = publishedOnly.filter(p => {
      // If no end date, assume it's active for 30 days from creation
      const targetDate = p.endDate?.seconds 
        ? new Date(p.endDate.seconds * 1000) 
        : (p.createdAt?.seconds ? new Date((p.createdAt.seconds + 2592000) * 1000) : new Date());
      
      const now = new Date();
      // Ensure we compare without being too loose on status
      return p.status !== 'ended' && targetDate > now;
    });
    const archived = publishedOnly.filter(p => {
      const targetDate = p.endDate?.seconds 
        ? new Date(p.endDate.seconds * 1000) 
        : (p.createdAt?.seconds ? new Date((p.createdAt.seconds + 2592000) * 1000) : new Date());
      
      const now = new Date();
      return p.status === 'ended' || targetDate <= now;
    });
    return { activePolls: active, archivedPolls: archived };
  }, [filteredPolls]);

  const [showArchive, setShowArchive] = useState(false);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative"
    >
      {/* Organic Glass Background Blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-[-1] bg-slate-50">
        <motion.div 
          animate={{ x: [0, 50, 0], y: [0, 100, 0], scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-ug-red/[0.03] rounded-full blur-[120px]"
        />
        <motion.div 
          animate={{ x: [0, -50, 0], y: [0, -100, 0], scale: [1, 1.5, 1], rotate: [0, -90, 0] }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] bg-ug-yellow/[0.03] rounded-full blur-[150px]"
        />
        <motion.div 
          animate={{ x: [0, 100, 0], y: [0, -50, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-[30%] right-[10%] w-[400px] h-[400px] bg-slate-900/[0.02] rounded-full blur-[100px]"
        />
      </div>

      <Helmet>
        <title>{`Uganda Votes ${currentYear} | National Digital Democracy Platform`}</title>
        <meta name="description" content={`Cast your vote in Uganda's premier digital polling platform for ${currentYear}. Transparent, secure, and real-time public opinion tracking across the country.`} />
        <meta name="keywords" content={`Uganda Votes, Uganda Elections ${currentYear}, Online Voting Uganda, Public Opinion Polls, Digital Democracy, electoral transparency Uganda`} />
        
        <meta property="og:type" content="website" />
        <meta property="og:url" content={window.location.origin} />
        <meta property="og:title" content={`Uganda Votes ${currentYear} | Professional Polling System`} />
        <meta property="og:description" content="Secure, transparent, and accessible digital voting for all Ugandans. Join the national digital democracy initiatives today." />
        <meta property="og:image" content="https://ugandavotes.netlify.app/favicon.ico" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={window.location.origin} />
        <meta name="twitter:title" content={`Uganda Votes ${currentYear} | Digital Democracy`} />
        <meta name="twitter:description" content="Participate in Uganda's digital democracy. Secure and verifiable voting results." />
        <meta name="twitter:image" content="https://ugandavotes.netlify.app/favicon.ico" />

        <link rel="canonical" href={window.location.origin} />

        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://ugandavotes.netlify.app",
            "@type": "WebSite",
            "name": "Uganda Votes",
            "url": window.location.origin,
            "description": "Uganda's premier digital democracy platform.",
            "potentialAction": {
              "@type": "SearchAction",
              "target": `${window.location.origin}/?page=home&search={search_term_string}`,
              "query-input": "required name=search_term_string"
            }
          })}
        </script>
      </Helmet>
      {/* Hero Section */}
      <section className="mb-8 -mx-4 sm:-mx-6 lg:-mx-8">
        <div className="bg-[#050B1F] relative overflow-hidden py-10 md:py-16 px-6 sm:px-12 text-center flex flex-col items-center">
          {/* Logo / Badge */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-4 flex flex-col items-center"
          >
            <img src="/favicon.ico" alt="Logo" className="w-14 h-14 mb-4 shadow-[0_0_30px_rgba(252,220,4,0.2)]" />
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/20 rounded-xl backdrop-blur-3xl shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
              <span className="text-[10px] font-black text-ug-yellow uppercase tracking-[0.25em]">
                Uganda Official Voting Platform
              </span>
            </div>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-2xl md:text-5xl font-sans font-black text-white max-w-4xl mb-6 leading-[1.1] tracking-tight uppercase px-4 break-words"
          >
            {(() => {
              const activeOnly = polls.filter(p => {
                const targetDate = p.endDate?.seconds ? new Date(p.endDate.seconds * 1000) : new Date();
                return p.status === 'active' && targetDate >= new Date();
              });
              return activeOnly[currentSlide % (activeOnly.length || 1)]?.title || "UGANDA VOTES ";
            })()} <br className="hidden md:block text-ug-yellow" />
            {(() => {
              const activeOnly = polls.filter(p => {
                const targetDate = p.endDate?.seconds ? new Date(p.endDate.seconds * 1000) : new Date();
                return p.status === 'active' && targetDate >= new Date();
              });
              const cat = activeOnly[currentSlide % (activeOnly.length || 1)]?.category || "";
              return cat;
            })()}
          </motion.h1>

          {/* Slider */}
          <div className="w-full max-w-xl aspect-[21/10] rounded-2xl overflow-hidden mb-12 border border-white/10 relative shadow-2xl group cursor-pointer bg-slate-900"
            onClick={() => {
              const activeOnly = polls.filter(p => {
                const targetDate = p.endDate?.seconds ? new Date(p.endDate.seconds * 1000) : new Date();
                return p.status === 'active' && targetDate >= new Date();
              });
              const p = activeOnly[currentSlide % (activeOnly.length || 1)];
              if (p) navigateTo('home', p.slug, p.title, null, null);
            }}
          >
            <AnimatePresence mode="wait">
              {heroImage ? (
                <motion.img 
                  key={heroImage}
                  src={heroImage}
                  initial={{ opacity: 0, scale: 1.1 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.6 }}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-slate-800">
                  <div className="w-6 h-6 border-2 border-ug-yellow/30 border-t-ug-yellow rounded-full animate-spin" />
                </div>
              )}
            </AnimatePresence>
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
            <div className="absolute bottom-4 left-5 right-5 flex items-center justify-between">
              <div className="text-left">
                <p className="text-[7px] font-bold text-ug-yellow uppercase tracking-[0.3em] mb-0.5">Ongoing Polls</p>
                <p className="text-[10px] font-bold text-white uppercase tracking-wider truncate max-w-[200px]">
                  {(() => {
                    const activeOnly = polls.filter(p => {
                      const targetDate = p.endDate?.seconds ? new Date(p.endDate.seconds * 1000) : new Date();
                      return p.status === 'active' && targetDate >= new Date();
                    });
                    const title = activeOnly[currentSlide % (activeOnly.length || 1)]?.title || "Loading...";
                    return title.length > 30 ? `${title.slice(0, 30)}...` : title;
                  })()}
                </p>
              </div>
              <div className="flex gap-1.5">
                {polls.filter(p => {
                  const targetDate = p.endDate?.seconds ? new Date(p.endDate.seconds * 1000) : new Date();
                  return p.status === 'active' && targetDate >= new Date();
                }).slice(0, 5).map((_, i) => {
                  const activeOnly = polls.filter(p => {
                    const targetDate = p.endDate?.seconds ? new Date(p.endDate.seconds * 1000) : new Date();
                    return p.status === 'active' && targetDate >= new Date();
                  });
                  return (
                    <div key={i} className={cn("w-1.5 h-1.5 rounded-full bg-white transition-all", (currentSlide % (activeOnly.length || 1)) === i ? "w-4 bg-ug-yellow" : "opacity-30")} />
                  );
                })}
              </div>
            </div>
          </div>
          
          <div className="flex gap-4 mb-4">
            {[
              { icon: <FaFacebook size={16} /> },
              { icon: <FaXTwitter size={14} /> },
              { icon: <Globe size={16} /> }
            ].map((soc, i) => (
              <div key={i} className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-white/50 bg-white/5">
                {soc.icon}
              </div>
            ))}
          </div>

          {/* Subtle Background Glows */}
          <div className="absolute top-1/4 -left-20 w-80 h-80 bg-ug-red/20 blur-[120px] rounded-full" />
          <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-ug-yellow/10 blur-[120px] rounded-full" />
        </div>
      </section>

      <div ref={pollsRef} className="flex flex-col md:flex-row md:items-center justify-between mb-16 border-b border-slate-200 pb-8 scroll-mt-24 gap-8">
        <div className="flex flex-col sm:flex-row gap-4 w-full">
          <div className="relative flex-grow">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search polls..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-xl border border-slate-200 bg-white text-slate-900 outline-none focus:ring-2 ring-ug-red/10 transition-all text-sm"
            />
          </div>
          <div className="relative flex-grow">
            <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Filter by location..." 
              value={locationQuery}
              onChange={e => setLocationQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-xl border border-slate-200 bg-white text-slate-900 outline-none focus:ring-2 ring-ug-red/10 transition-all text-sm"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        <AnimatePresence mode="popLayout">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <motion.div 
                key={`skeleton-${i}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
              >
                <div className="aspect-[4/3] bg-slate-50 animate-pulse" />
                <div className="p-8 space-y-4">
                  <div className="h-6 w-3/4 bg-slate-50 animate-pulse rounded-full" />
                  <div className="h-4 w-1/2 bg-slate-50 animate-pulse rounded-full" />
                  <div className="pt-4 flex justify-between">
                    <div className="h-10 w-24 bg-slate-50 animate-pulse rounded-full" />
                    <div className="h-10 w-10 bg-slate-50 animate-pulse rounded-full" />
                  </div>
                </div>
              </motion.div>
            ))
          ) : activePolls.length > 0 ? (
            activePolls.map((poll, idx) => (
              <motion.div
                key={poll.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              >
                <button
                  onClick={() => navigateTo('home', poll.slug, poll.title, null, null)}
                  className="w-full text-left group"
                >
                  <div className="relative overflow-hidden rounded-2xl bg-slate-900 aspect-[4/3] shadow-[0_20px_50px_rgba(0,0,0,0.15)] group-hover:shadow-[0_40px_100px_rgba(0,0,0,0.25)] transition-all duration-700 border border-slate-200">
                    <img 
                      src={poll.bannerURL || `https://ugandavotes.netlify.app/favicon.ico`} 
                      alt={poll.title}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-110 opacity-70 group-hover:opacity-100"
                      referrerPolicy="no-referrer"
                    />
                    
                    {/* Glass Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-80 group-hover:opacity-60 transition-opacity duration-700" />
                    
                    {/* Badge */}
                    <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-white/10 backdrop-blur-2xl border border-white/20 rounded-lg shadow-lg">
                          <div className="w-1.5 h-1.5 rounded-full bg-ug-yellow animate-pulse" />
                          <span className="text-[9px] font-black uppercase tracking-widest text-white">{poll.category || 'National'}</span>
                        </div>
                    </div>

                    {/* Content Glass Card */}
                    <div className="absolute inset-x-3 bottom-3 p-5 z-20 bg-white/5 backdrop-blur-[24px] border border-white/10 rounded-2xl overflow-hidden group-hover:bg-white/10 transition-all duration-500">
                      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                      
                      <h3 className="text-lg font-display font-black text-white mb-2 group-hover:text-ug-yellow transition-colors leading-tight uppercase tracking-tighter italic">
                        {poll.title}
                      </h3>
                      
                      <div className="flex items-center justify-between mt-6">
                        <div className="flex items-center gap-2">
                          {(() => {
                            const targetDate = poll.endDate?.seconds ? new Date(poll.endDate.seconds * 1000) : new Date();
                            const isEnded = poll.status === 'ended' || targetDate < new Date();
                            
                            return (
                              <div className={cn(
                                "px-4 py-2 rounded-xl font-black text-[9px] uppercase tracking-[0.2em] transition-all shadow-xl flex items-center gap-1.5",
                                isEnded ? "bg-white/10 text-white/50 backdrop-blur-sm" : "bg-ug-yellow text-slate-900 hover:scale-105 active:scale-95"
                              )}>
                                {isEnded ? "Results" : "Vote Now"}
                                {!isEnded && <ChevronRight size={10} />}
                              </div>
                            );
                          })()}
                        </div>
                        
                        <div className="flex flex-col items-end">
                          <div className="flex items-center gap-1 mb-1">
                            <VoteTickIcon size={10} className="text-white/40" />
                            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white/40">Votes</span>
                          </div>
                          <div className="text-sm font-mono font-black text-white flex items-center gap-1.5">
                            <NumberTicker value={poll.totalVotes || 0} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              </motion.div>
            ))
          ) : activePolls.length === 0 && archivedPolls.length > 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="col-span-full py-20 text-center bg-slate-50 rounded-2xl border border-slate-200 border-dashed"
            >
              <h3 className="text-xl font-display font-bold text-slate-400 mb-2 italic">No Active Polls Found</h3>
              <p className="text-slate-400 text-xs uppercase tracking-widest font-bold">Check the archive section below for past results</p>
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="col-span-full py-20 text-center"
            >
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-400">
                <Search size={32} />
              </div>
              <h3 className="text-2xl font-display font-bold text-slate-900 mb-2 italic">No registries found</h3>
              <p className="text-slate-500">Try adjusting your search or location filters.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {/* Wall of Fame Section (Relocated) */}
      <section className="mt-32 mb-28">
        <div className="flex flex-col items-center mb-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-ug-yellow/10 border border-ug-yellow/20 rounded-full backdrop-blur-xl mb-4">
            <Trophy size={14} className="text-ug-yellow" />
            <span className="text-[10px] font-black text-ug-yellow uppercase tracking-[0.2em]">Wall Of Fame</span>
          </div>
          <h2 className="text-4xl md:text-6xl font-display font-black tracking-tighter text-slate-900 mb-8 leading-[0.9] uppercase">
            Wall Of <span className="text-ug-red italic">Fame</span>
          </h2>
          <p className="text-slate-500 text-lg font-light leading-relaxed mb-10 max-w-md">
          </p>
        </div>

        {topPoll ? (
          <div className="w-full max-w-6xl mx-auto">
            <motion.div 
              layoutId={`poll-card-${topPoll.id}`}
              onClick={() => setShowAnalysis(!showAnalysis)}
              className="relative aspect-[21/9] md:aspect-[21/7] rounded-3xl overflow-hidden group cursor-pointer shadow-[0_40px_100px_rgba(0,0,0,0.1)] border border-slate-100 bg-slate-900"
            >
              {/* Winner Badge */}
              {topPollWinner && (
                <div className="absolute top-8 right-8 z-30">
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-black/60 backdrop-blur-2xl border border-white/10 rounded-2xl p-3 flex items-center gap-3 shadow-2xl"
                  >
                    <div className="w-8 h-8 rounded-lg overflow-hidden border border-ug-yellow/30 relative">
                      <img src={topPollWinner.photoURL} alt={topPollWinner.name} className="w-full h-full object-cover" />
                      <div className="absolute top-0 right-0 p-0.5 bg-ug-yellow rounded-bl-sm">
                        <Award size={8} className="text-slate-900" />
                      </div>
                    </div>
                    <div className="text-left">
                      <p className="text-[7px] font-bold text-ug-yellow uppercase tracking-[0.2em]">Grand Champion</p>
                      <p className="text-[10px] font-black text-white uppercase truncate max-w-[120px]">{topPollWinner.name}</p>
                    </div>
                  </motion.div>
                </div>
              )}

              <img 
                src={topPoll.bannerURL || `https://images.unsplash.com/photo-1590402421685-822c23913b51?auto=format&fit=crop&q=80&w=1200`} 
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-105 opacity-60"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
              
              <div className="absolute inset-0 flex flex-col justify-end p-10 md:p-16 text-left">
                <div className="flex flex-wrap items-end justify-between gap-8">
                  <div className="max-w-3xl">
                    <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 bg-white/5 backdrop-blur-3xl border border-white/20 rounded-full">
                      <span className="w-2 h-2 rounded-full bg-ug-red animate-pulse" />
                      <span className="text-[10px] font-black text-white/90 uppercase tracking-[0.2em]">{topPoll.category} National Registry</span>
                    </div>
                    <h3 className="text-2xl md:text-5xl font-display font-medium text-white mb-2 leading-none uppercase tracking-tight italic break-words">
                      {topPoll.title}
                    </h3>
                  </div>

                  <div className="bg-white/5 backdrop-blur-3xl border border-white/10 p-6 md:p-8 rounded-2xl md:rounded-[2rem] text-center md:text-right shadow-[0_20px_50px_rgba(0,0,0,0.3)] w-full md:w-auto">
                    <p className="text-[9px] md:text-[10px] font-black text-ug-yellow uppercase tracking-[0.3em] mb-2">Total Voices</p>
                    <div className="text-3xl md:text-6xl font-mono font-black text-white flex items-center justify-center md:justify-end gap-2 md:gap-3 leading-none italic">
                      <Users size={24} className="text-ug-yellow md:w-10 md:h-10" />
                      <NumberTicker value={topPoll.totalVotes || 0} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="absolute bottom-8 right-1/2 translate-x-1/2 z-30">
                <div className="p-3 bg-white/10 backdrop-blur-md rounded-full border border-white/10 text-white animate-bounce">
                  <ChevronDown size={24} />
                </div>
              </div>
            </motion.div>

            <AnimatePresence>
              {showAnalysis && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
                    <div className="bg-slate-50 rounded-3xl p-10 border border-slate-100">
                      <TrendingUp className="text-ug-red mb-6 mx-auto md:mx-0" size={32} />
                      <h4 className="text-slate-900 font-bold uppercase tracking-widest text-xs mb-3">Historic Engagement</h4>
                      <p className="text-slate-500 text-sm leading-relaxed">
                        Setting a national record for participation in Premier League affairs, mirroring the high stakes of modern democracy.
                      </p>
                    </div>
                    <div className="bg-slate-50 rounded-3xl p-10 border border-slate-100">
                      <Activity className="text-ug-yellow mb-6 mx-auto md:mx-0" size={32} />
                      <h4 className="text-slate-900 font-bold uppercase tracking-widest text-xs mb-3">Certified Status</h4>
                      <p className="text-slate-500 text-sm leading-relaxed">
                        The consensus remains {topPoll.status === 'active' ? 'tracking active consensus' : 'archived with certified results'}. 
                        99.9% verifiable digital identities.
                      </p>
                    </div>
                    <div className="bg-slate-900 rounded-3xl p-10 text-left flex flex-col justify-between shadow-2xl">
                      <div>
                        <StatsIcon className="text-ug-yellow mb-6" size={32} />
                        <h4 className="text-white font-bold uppercase tracking-widest text-xs mb-3">Deep Analysis</h4>
                      </div>
                      <button 
                        onClick={() => navigateTo('home', topPoll.slug, topPoll.title, null, null)}
                        className="w-full py-5 bg-ug-yellow rounded-3xl text-slate-900 font-bold uppercase tracking-widest text-[11px] hover:bg-white transition-all shadow-xl"
                      >
                        View Registry Details
                      </button>
                    </div>
                  </div>

                  {/* Wide Real Graph */}
                  <div className="mt-8 bg-slate-50 rounded-3xl p-8 md:p-12 border border-slate-100">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                      <div>
                        <h4 className="text-slate-900 font-black uppercase tracking-widest text-sm mb-1">Performance metrics</h4>
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest italic">Comparative distribution of verified votes across participants</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 px-3 py-1 bg-white/50 backdrop-blur-md border border-white/60 rounded-full shadow-sm">
                          <div className="w-2 h-2 rounded-full bg-ug-red" />
                          <span className="text-[10px] font-bold text-slate-800 uppercase tracking-widest">Live Votes</span>
                        </div>
                      </div>
                    </div>

                    <div className="h-[400px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={topPollCandidates.slice(0, 6)} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888822" />
                          <XAxis 
                            dataKey="name" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: '#64748B', fontSize: 10, fontWeight: 700 }}
                            interval={0}
                            angle={-45}
                            textAnchor="end"
                          />
                          <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: '#64748B', fontSize: 10, fontWeight: 700 }}
                          />
                          <Tooltip 
                            cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="bg-white/90 border border-white/60 px-4 py-3 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] backdrop-blur-3xl">
                                    <p className="text-slate-900 text-[10px] font-black uppercase tracking-widest mb-1">{payload[0].payload.name}</p>
                                    <div className="flex items-center gap-2">
                                      <div className="w-2 h-2 rounded-full bg-ug-red" />
                                      <p className="text-slate-900 text-xs font-mono font-black italic">{payload[0].value?.toLocaleString()} Votes</p>
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Bar 
                            dataKey="voteCount" 
                            radius={[12, 12, 0, 0]} 
                            barSize={50}
                          >
                            {topPollCandidates.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={index === 0 ? '#CD121F' : '#FCDC04'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <div className="w-full max-w-sm aspect-video bg-slate-100 rounded-[40px] animate-pulse flex items-center justify-center mx-auto">
            <Loader2 className="text-ug-red animate-spin" size={32} />
          </div>
        )}
      </section>

      {/* Live Voting Map & Special Polls Section */}
      <section className="mb-20" id="participation-map">
        <div className="bg-slate-900 rounded-[3rem] p-8 md:p-16 relative overflow-hidden shadow-2xl border border-white/5">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-ug-red/10 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2" />
          
          <div className="relative z-10">
            <div className="max-w-3xl mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/5 rounded-full text-ug-yellow text-[10px] font-black uppercase tracking-[0.2em] mb-8 border border-white/10">
                <Globe size={14} />
                Global Consensus tracking
              </div>
              <h2 className="text-4xl md:text-7xl font-display font-black tracking-tight text-white mb-8 leading-[0.9] uppercase italic">
                Interactive <br />
                <span className="text-ug-red italic">Participation Map</span>
              </h2>
              <p className="text-slate-400 text-lg font-light leading-relaxed mb-12 max-w-xl">
                Monitor live engagement across global hubs. Our <span className="text-white font-bold">Special Polls</span> below track performance across major categories with real-time verification.
              </p>
            </div>

            {/* Special Polls Grid - As requested: Grid display for special polls */}
            <div className="mb-20">
              <div className="flex items-center gap-3 mb-8">
                <Star className="text-ug-yellow fill-ug-yellow" size={20} />
                <h3 className="text-xl font-display font-bold text-white uppercase tracking-tight italic">Premium National Registries</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {polls.filter(p => p.isSpecial).length > 0 ? (
                  polls.filter(p => p.isSpecial).map((poll, idx) => (
                    <motion.button
                      key={poll.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: idx * 0.1 }}
                      onClick={() => navigateTo('home', poll.slug, poll.title, null, null)}
                      className="group relative bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all text-left overflow-hidden h-full flex flex-col"
                    >
                      <div className="absolute top-0 right-0 w-20 h-20 bg-ug-yellow/10 blur-2xl rounded-full" />
                      <div className="relative z-10 flex flex-col h-full">
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-[8px] font-black text-ug-yellow uppercase tracking-widest px-2 py-1 bg-ug-yellow/10 rounded leading-none">Special</span>
                          <Trophy size={14} className="text-white/20" />
                        </div>
                        <h4 className="text-sm font-black text-white uppercase tracking-tight mb-4 group-hover:text-ug-yellow transition-colors line-clamp-2 leading-tight">
                          {poll.title}
                        </h4>
                        <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="text-[7px] font-bold text-white/40 uppercase tracking-widest mb-1 italic">Votes</span>
                            <span className="text-lg font-mono font-black text-white italic tracking-tighter">
                              <NumberTicker value={poll.totalVotes || 0} />
                            </span>
                          </div>
                          <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-ug-yellow group-hover:text-black transition-all">
                            <ChevronRight size={16} />
                          </div>
                        </div>
                      </div>
                    </motion.button>
                  ))
                ) : (
                  <div className="col-span-full p-12 text-center bg-white/5 rounded-3xl border border-dashed border-white/10">
                    <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.3em]">No Premium Registries Active</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Interactive Participation Map - Now using Leaflet to avoid API key errors */}
            <div className="relative aspect-video md:aspect-[21/9] bg-[#050B1F] rounded-[2.5rem] border border-white/10 overflow-hidden shadow-inner group">
              <ParticipationMap polls={polls} onLocationClick={(loc) => {
                setLocationQuery(loc);
                scrollToPolls();
              }} />
              
              <div className="absolute top-8 left-8 z-20">
                <div className="px-6 py-3 bg-black/60 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl">
                  <div className="flex items-center gap-3">
                    <Activity className="text-ug-red animate-pulse" size={18} />
                    <div>
                      <p className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Live Voting Grid</p>
                      <p className="text-[8px] text-white/40 uppercase tracking-widest font-bold">Real-time participation telemetry</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="absolute bottom-8 left-8 right-8 p-6 bg-black/40 backdrop-blur-3xl rounded-2xl border border-white/10 opacity-0 group-hover:opacity-100 transition-all duration-700 shadow-2xl z-20">
                <div className="flex items-center justify-between">
                  <div className="flex gap-10">
                    <div>
                      <p className="text-2xl font-display font-black text-white tracking-widest">{polls.filter(p => p.status === 'active').length}</p>
                      <p className="text-[8px] font-bold text-white/40 uppercase tracking-widest">Active Channels</p>
                    </div>
                    <div>
                      <p className="text-2xl font-display font-black text-white tracking-widest">
                        <NumberTicker value={polls.reduce((acc, p) => acc + (p.totalVotes || 0), 0)} />
                      </p>
                      <p className="text-[8px] font-bold text-white/40 uppercase tracking-widest">Aggregate Votes</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {centers.slice(0, 3).map(c => (
                      <div key={c.name} className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg">
                        <span className="text-[8px] font-bold text-white/60 uppercase tracking-widest">{c.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Finished Projects Section */}
      <section className="mb-20" id="finished-projects">
        <div className="border-t border-slate-200 pt-16">
          <button 
            onClick={() => setShowArchive(!showArchive)}
            className="w-full flex items-center justify-between group py-8 px-4"
          >
            <div className="flex items-center gap-6">
              <div className="w-14 h-14 rounded-[20px] bg-slate-50 flex items-center justify-center text-slate-500 group-hover:bg-slate-900 group-hover:text-white transition-all shadow-sm">
                <CheckSquare size={28} />
              </div>
              <div className="text-left">
                <h3 className="text-2xl font-display font-bold text-slate-900 leading-tight">Finished Projects</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Certified Results & Concluded Session Data</p>
              </div>
            </div>
            <ChevronRight className={cn("text-slate-300 transition-transform duration-300", showArchive ? "rotate-90" : "")} size={32} />
          </button>
          
          <AnimatePresence>
            {showArchive && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-10 space-y-4 max-h-[800px] overflow-y-auto pr-4 custom-scrollbar px-4 pb-10">
                  {archivedPolls.length > 0 ? (
                    archivedPolls.map((poll, idx) => (
                      <motion.button 
                        key={poll.id}
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: idx * 0.05 }}
                        onClick={() => navigateTo('home', poll.slug, poll.title, null, null)}
                        className="group w-full bg-white border border-slate-200 rounded-[2rem] p-4 md:p-5 hover:shadow-2xl hover:border-ug-yellow/30 transition-all flex flex-col md:flex-row items-center gap-6 text-left"
                      >
                        <div className="w-full md:w-40 aspect-square bg-slate-50 rounded-2xl overflow-hidden flex-shrink-0 border border-slate-100 group-hover:border-ug-yellow/20 transition-all relative">
                          <img 
                            src={poll.bannerURL || `https://picsum.photos/seed/${poll.id}/400/400`} 
                            alt="" 
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute top-2 right-2 px-2 py-1 bg-black/60 backdrop-blur-md rounded-lg">
                             <span className="text-[7px] font-black text-ug-yellow uppercase tracking-widest">Ended</span>
                          </div>
                        </div>

                        <div className="flex-grow flex flex-col justify-center">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[8px] font-black uppercase tracking-widest rounded-md italic">
                              {poll.category || 'National'}
                            </span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic">{poll.location || 'Uganda'}</span>
                          </div>
                          <h3 className="text-xl font-display font-black text-slate-900 uppercase tracking-tight mb-3 group-hover:text-ug-red transition-colors line-clamp-1">
                            {poll.title}
                          </h3>
                          <div className="flex items-center gap-8">
                            <div className="flex flex-col">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5 italic">Total Participation</span>
                              <span className="text-lg font-display font-black text-slate-950 italic tracking-tighter">
                                <NumberTicker value={poll.totalVotes || 0} />
                                <span className="text-[10px] ml-1 text-slate-400 uppercase font-bold tracking-widest">Votes Cast</span>
                              </span>
                            </div>
                            <div className="w-px h-8 bg-slate-100" />
                            <div className="flex flex-col">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5 italic">Consensus</span>
                              <div className="flex items-center gap-2">
                                <Trophy size={14} className="text-ug-yellow" />
                                <span className="text-[10px] font-black text-slate-900 uppercase tracking-tight">Archive Certified</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex-shrink-0 flex items-center justify-center p-5 bg-slate-50 rounded-2xl group-hover:bg-ug-yellow transition-all">
                          <ArrowRight size={20} className="text-slate-300 group-hover:text-black group-hover:translate-x-1 transition-all" />
                        </div>
                      </motion.button>
                    ))
                  ) : (
                    <div className="col-span-full py-20 text-center bg-slate-50 rounded-[3rem] border border-dashed border-slate-200">
                      <p className="text-slate-400 font-black uppercase text-[11px] tracking-[0.4em] italic">No archived registries found</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

    </motion.div>
  );
}

function ParticipationMap({ polls, onLocationClick }: { polls: any[], onLocationClick: (loc: string) => void }) {
  return (
    <div className="w-full h-full">
      <MapContainer 
        center={[1.3733, 32.2903]} 
        zoom={7} 
        style={{ width: '100%', height: '100%', background: '#050B1F' }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <MapMarkers polls={polls} onLocationClick={onLocationClick} />
      </MapContainer>
    </div>
  );
}

function MapMarkers({ polls, onLocationClick }: { polls: any[], onLocationClick: (loc: string) => void }) {
  const map = useMap();
  
  return (
    <>
      {centers.map((center) => {
        const isActive = polls.some(p => p.location?.toLowerCase().includes(center.name.toLowerCase()));
        
        // Define high-visibility custom icon for active hubs
        const activeIcon = L.divIcon({
          className: 'custom-div-icon',
          html: `<div class="relative">
            ${isActive ? '<div class="absolute inset-0 bg-ug-red rounded-full animate-ping opacity-50 scale-150"></div>' : ''}
            <div class="w-4 h-4 rounded-full border-2 border-white shadow-2xl transition-all ${isActive ? 'bg-ug-red' : 'bg-ug-yellow'}"></div>
          </div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        });

        return (
          <Marker 
            key={center.name}
            position={[center.lat, center.lng]}
            icon={activeIcon}
            eventHandlers={{
              click: () => onLocationClick(center.name),
            }}
          >
            <Popup className="custom-popup">
              <div className="p-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-900 mb-0.5">{center.name}</p>
                {isActive && <p className="text-[8px] font-bold text-ug-red uppercase tracking-tight">Active Consensus hub</p>}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}
