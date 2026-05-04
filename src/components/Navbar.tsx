import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation } from '../contexts/NavigationContext';
import { LogOut, Menu, X, Sun, Moon, BarChart3, ChevronDown, Rocket, Timer as TimerIcon, CheckSquare, Award } from 'lucide-react';
import HomeIcon from './HomeIcon';
import { AdminIcon, StatsIcon, ProfileIcon } from './CustomIcons';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import AuthModal from './AuthModal';

export default function Navbar() {
  const { user, profile, isAdmin, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { navigateTo, selectedPollSlug, selectedPollTitle, currentPage } = useNavigation();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProjectsDropdownOpen, setIsProjectsDropdownOpen] = useState(false);
  const currentYear = new Date().getFullYear();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProjectsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const projectCategories = [
    { id: 'ongoing', label: 'Ongoing Projects', icon: <Rocket size={14} />, description: 'Browse active public voting projects.' },
    { id: 'upcoming', label: 'Upcoming Projects', icon: <TimerIcon size={14} />, description: 'See active projects scheduled to start soon.' },
    { id: 'finished', label: 'Finished Projects', icon: <CheckSquare size={14} />, description: 'Review projects that have already closed.' },
  ];

  const pollCategories = [
    { id: 'special', label: 'Special Polls', icon: <Award size={14} />, description: 'Exclusive national performance metrics.' },
  ];

  return (
    <>
      <nav className="sticky top-0 z-[100] w-full bg-[#0F172A] border-b border-white/10 transition-all duration-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-12 items-center">
            <div className="flex items-center gap-8">
              <button onClick={() => navigateTo('home')} className="flex items-center gap-2 md:gap-3 group">
                <img src="/favicon.ico" alt="Logo" className="w-6 h-6 md:w-8 md:h-8 rounded-md shadow-lg group-hover:scale-110 transition-transform" />
                <div className="relative flex items-center">
                  <AnimatePresence mode="wait">
                    {selectedPollSlug && selectedPollTitle ? (
                      <motion.span 
                        key="poll-title"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        className="text-xs md:text-base font-display font-bold text-ug-yellow italic truncate max-w-[180px] md:max-w-xs"
                      >
                        {selectedPollTitle}
                      </motion.span>
                    ) : (
                      <motion.span 
                        key="app-title"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        className="text-sm md:text-lg font-display font-black tracking-tighter flex items-center italic"
                      >
                        <div className="flex flex-col items-center">
                          <div className="flex items-center">
                            <span className="text-white group-hover:text-ug-yellow transition-colors">UGANDA</span>
                            <span className="text-ug-yellow ml-1">VOTES</span>
                        </div>
                        <span className="text-[8px] md:text-[10px] font-mono text-white/40 tracking-[0.3em] font-bold mt-[-2px] md:mt-[-4px] uppercase">{currentYear}</span>
                      </div>
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
              </button>

              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center gap-6">
                {/* Projects Dropdown */}
                <div className="relative group" ref={dropdownRef}>
                  <button 
                    onClick={() => setIsProjectsDropdownOpen(!isProjectsDropdownOpen)}
                    onMouseEnter={() => setIsProjectsDropdownOpen(true)}
                    className={cn(
                      "flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all py-4",
                      isProjectsDropdownOpen ? "text-ug-yellow" : "text-white/60 hover:text-white"
                    )}
                  >
                    Projects
                    <ChevronDown size={14} className={cn("transition-transform duration-300", isProjectsDropdownOpen && "rotate-180")} />
                  </button>

                  <AnimatePresence>
                    {isProjectsDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        onMouseLeave={() => setIsProjectsDropdownOpen(false)}
                        className="absolute left-0 top-full mt-0 w-[320px] bg-[#161F36] border border-white/10 rounded-2xl shadow-[0_30px_70px_rgba(0,0,0,0.6)] p-3 z-[200]"
                      >
                        <div className="space-y-1">
                          {projectCategories.map((cat) => (
                            <button
                              key={cat.id}
                              onClick={() => {
                                navigateTo('home');
                                setIsProjectsDropdownOpen(false);
                                if (cat.id === 'finished') {
                                  setTimeout(() => {
                                    const el = document.getElementById('finished-projects');
                                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                                  }, 100);
                                }
                              }}
                              className="w-full flex items-start gap-4 p-4 rounded-xl hover:bg-white/5 transition-all group text-left"
                            >
                              <div className="p-2 bg-white/5 rounded-lg text-ug-yellow group-hover:bg-ug-yellow group-hover:text-black transition-all">
                                {cat.icon}
                              </div>
                              <div>
                                <p className="text-[11px] font-black text-white uppercase tracking-widest mb-1">{cat.label}</p>
                                <p className="text-[9px] text-white/40 leading-relaxed font-medium">{cat.description}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Polls Dropdown */}
                <div className="relative group">
                  <button 
                    className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all text-white/60 hover:text-white py-4"
                  >
                    Polls
                    <ChevronDown size={14} className="group-hover:rotate-180 transition-transform duration-300" />
                  </button>
                  <div className="absolute left-0 top-full pt-0 hidden group-hover:block transition-all z-[200]">
                    <div className="w-[300px] bg-[#161F36] border border-white/10 rounded-2xl shadow-2xl p-3">
                      {pollCategories.map(cat => (
                        <button
                          key={cat.id}
                          onClick={() => {
                            navigateTo('home');
                            setTimeout(() => {
                              const el = document.getElementById('participation-map');
                              if (el) el.scrollIntoView({ behavior: 'smooth' });
                            }, 100);
                          }}
                          className="w-full flex items-start gap-4 p-4 rounded-xl hover:bg-white/5 transition-all group text-left"
                        >
                          <div className="p-2 bg-white/5 rounded-lg text-ug-red">
                            {cat.icon}
                          </div>
                          <div>
                            <p className="text-[11px] font-black text-white uppercase tracking-widest mb-1">{cat.label}</p>
                            <p className="text-[9px] text-white/40 leading-relaxed font-medium">{cat.description}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative">
                <button 
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all flex items-center justify-center border border-white/5"
                  title="Menu"
                >
                  {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
                </button>

                <AnimatePresence>
                  {isMenuOpen && (
                    <>
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-40" 
                        onClick={() => setIsMenuOpen(false)} 
                      />
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 top-full mt-2 w-56 bg-slate-900 border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden z-50 p-2 backdrop-blur-xl"
                      >
                        <div className="px-4 py-2 border-b border-white/5 mb-2">
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Menu</p>
                        </div>

                        <button 
                          onClick={() => { navigateTo('home'); setIsMenuOpen(false); }} 
                          className={cn(
                            "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all mb-1",
                            currentPage === 'home' && !selectedPollSlug ? "bg-ug-yellow/10 text-ug-yellow" : "text-gray-400 hover:bg-white/5 hover:text-white"
                          )}
                        >
                          <HomeIcon size={18} />
                          <span className="text-[11px] font-black tracking-widest italic">Home</span>
                        </button>
                                                <div className="px-4 py-2 border-b border-white/5 mb-2 mt-4">
                           <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Projects</p>
                         </div>
                         {projectCategories.map(cat => (
                           <button 
                             key={cat.id}
                             onClick={() => { 
                               navigateTo('home'); 
                               setIsMenuOpen(false);
                               if (cat.id === 'finished') {
                                 setTimeout(() => {
                                   const el = document.getElementById('finished-projects');
                                   if (el) el.scrollIntoView({ behavior: 'smooth' });
                                 }, 100);
                               }
                             }} 
                             className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all mb-1 text-gray-400 hover:bg-white/5 hover:text-white"
                           >
                             <div className="text-ug-yellow">{cat.icon}</div>
                             <span className="text-[10px] font-black tracking-widest italic">{cat.label}</span>
                           </button>
                         ))}

                         <div className="px-4 py-2 border-b border-white/5 mb-2 mt-4">
                           <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Polls</p>
                         </div>
                         {pollCategories.map(cat => (
                           <button 
                             key={cat.id}
                             onClick={() => { 
                               navigateTo('home'); 
                               setIsMenuOpen(false);
                               setTimeout(() => {
                                 const el = document.getElementById('participation-map');
                                 if (el) el.scrollIntoView({ behavior: 'smooth' });
                               }, 100);
                             }} 
                             className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all mb-1 text-gray-400 hover:bg-white/5 hover:text-white"
                           >
                             <div className="text-ug-red">{cat.icon}</div>
                             <span className="text-[10px] font-black tracking-widest italic">{cat.label}</span>
                           </button>
                         ))}

                        {isAdmin && (
                          <button 
                            onClick={() => { navigateTo('admin'); setIsMenuOpen(false); }} 
                            className={cn(
                              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
                              currentPage === 'admin' ? "bg-ug-yellow/10 text-ug-yellow" : "text-gray-400 hover:bg-white/5 hover:text-white"
                            )}
                          >
                            <AdminIcon size={18} />
                            <span className="text-[11px] font-black tracking-widest italic">Admin</span>
                          </button>
                        )}
                        
                        <div className="mt-4 pt-4 border-t border-white/5 px-2">
                          <button 
                            onClick={toggleTheme} 
                            className="w-full flex items-center justify-center p-3 bg-white/5 rounded-xl text-ug-yellow hover:bg-white/10 transition-all"
                          >
                            {isDark ? <Sun size={18} /> : <Moon size={18} />}
                          </button>
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              {user ? (
                <div className="flex items-center gap-3 pl-4 border-l border-white/10">
                  <button onClick={() => navigateTo('profile')} className="flex items-center gap-2 group">
                    <div className="relative">
                      <img 
                        src={profile?.photoURL || user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} 
                        alt="" 
                        className="w-7 h-7 rounded-lg border-2 border-transparent group-hover:border-ug-yellow transition-all object-cover shadow-lg" 
                        referrerPolicy="no-referrer" 
                      />
                      {isAdmin && <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#0F172A]" />}
                    </div>
                    <div className="hidden sm:block text-left">
                      <p className="text-[9px] font-bold text-white leading-none mb-0.5">{profile?.displayName || user.displayName}</p>
                      <p className="text-[7px] font-mono text-gray-500 uppercase tracking-widest">{isAdmin ? "Admin" : "Voter"}</p>
                    </div>
                  </button>
                  <button 
                    onClick={logout}
                    className="p-2 rounded-xl hover:bg-white/10 transition-all text-ug-red active:scale-90"
                    title="Logout"
                  >
                    <LogOut size={16} />
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setIsAuthModalOpen(true)}
                  className="flex items-center gap-2 px-6 py-2 bg-ug-yellow text-black rounded-full text-[9px] font-bold uppercase tracking-[0.2em] hover:scale-105 transition-all active:scale-95 shadow-2xl"
                >
                  <ProfileIcon size={12} />
                  <span>Sign In</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </>
  );
}
