import React from 'react';
import HomeIcon from './HomeIcon';
import { AdminIcon, StatsIcon, ProfileIcon } from './CustomIcons';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '../contexts/NavigationContext';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

export default function BottomNav() {
  const { user, isAdmin } = useAuth();
  const { currentPage, navigateTo } = useNavigation();

  const navItems: { icon: any, label: string, id: 'home' | 'polls' | 'admin' | 'profile' }[] = [
    { icon: HomeIcon, label: 'Home', id: 'home' },
    { icon: StatsIcon, label: 'Polls', id: 'polls' },
    ...(isAdmin ? [{ icon: AdminIcon, label: 'Admin', id: 'admin' as const }] : []),
    { icon: ProfileIcon, label: 'Profile', id: 'profile' },
  ];

  return (
    <div className="md:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-[250] w-[92%] max-w-sm">
      <div className="bg-white/5 backdrop-blur-[32px] border border-white/10 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.1)] px-6 py-1.5 flex justify-around items-center transition-all duration-500">
        {navItems.map((item) => {
          const isActive = currentPage === item.id;
          
          return (
            <button 
              key={item.id}
              onClick={() => navigateTo(item.id)}
              className={cn(
                "flex flex-col items-center gap-1.5 transition-all duration-500 relative py-1 px-3 rounded-xl",
                isActive ? "text-ug-yellow scale-110" : "text-white/40 hover:text-white/90"
              )}
            >
              <div className={cn(
                "transition-all duration-500",
                isActive ? "drop-shadow-[0_0_8px_rgba(252,220,4,0.5)]" : ""
              )}>
                <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={cn(
                "text-[7px] font-black uppercase tracking-[0.2em] transition-all",
                isActive ? "opacity-100" : "opacity-0 scale-50"
              )}>
                {item.label}
              </span>
              {isActive && (
                <motion.div 
                  layoutId="activeTabCrystal"
                  className="absolute -bottom-1 w-6 h-1 bg-gradient-to-r from-transparent via-ug-yellow to-transparent rounded-full shadow-[0_0_10px_rgba(252,220,4,0.8)]"
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
