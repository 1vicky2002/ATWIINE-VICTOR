import React, { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useNavigation } from '../contexts/NavigationContext';
import { motion } from 'motion/react';
import { FaFacebook, FaXTwitter, FaWhatsapp } from 'react-icons/fa6';

export default function Footer() {
  const { navigateTo } = useNavigation();
  const currentYear = new Date().getFullYear();
  const [globalSponsors, setGlobalSponsors] = useState<any[]>([]);

  useEffect(() => {
    return onSnapshot(doc(db, 'settings', 'global'), (snap) => {
      if (snap.exists()) {
        setGlobalSponsors(snap.data().globalSponsors || []);
      }
    }, (error) => {
      console.warn("Global sponsors listener restricted or failed", error);
    });
  }, []);

  return (
    <footer className="bg-[#0b0f1a] text-white py-6 border-t border-white/5 w-full">
      <div className="max-w-7xl mx-auto px-6 text-center">
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-[10px] font-bold text-slate-500 lowercase tracking-widest mb-4">
          <span className="text-slate-400">{currentYear} ©UgandaVotes™</span>
          <span className="text-white/10">|</span>
          <button onClick={() => navigateTo('home')} className="hover:text-ug-yellow transition-colors">terms of use</button>
          <span className="text-white/10">|</span>
          <button onClick={() => navigateTo('home')} className="hover:text-ug-yellow transition-colors">privacy policy</button>
          <span className="text-white/10">|</span>
          <button onClick={() => navigateTo('home')} className="hover:text-ug-yellow transition-colors">premium terms</button>
          <span className="text-white/10">|</span>
          <button onClick={() => navigateTo('home')} className="hover:text-ug-yellow transition-colors">boosting terms</button>
          <span className="text-white/10">|</span>
          <button onClick={() => navigateTo('home')} className="hover:text-ug-yellow transition-colors">lazy voting terms</button>
          <span className="text-white/10">|</span>
          <button onClick={() => navigateTo('home')} className="hover:text-ug-yellow transition-colors">asked questions</button>
          
          <div className="w-full mt-2 flex justify-center gap-4">
            <a href="/sitemap.xml" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">sitemap</a>
            <span className="text-white/10">|</span>
            <button onClick={() => navigateTo('home')} className="hover:text-white transition-colors">join ugandavotes</button>
          </div>
        </div>
        
        <div className="space-y-2">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">UgandaVotes Is A Product Of CYBER TECH</p>
          <p className="text-[9px] font-medium text-slate-500 uppercase tracking-tight">Location: Ishaka, Basajja Street 20 | Near URA offices Email: cybertechsoftwares@gmail.com</p>
        </div>
      </div>
    </footer>
  );
}
