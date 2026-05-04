import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { NavigationProvider, useNavigation } from './contexts/NavigationContext';
import ErrorBoundary from './components/ErrorBoundary';
import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';
import BackToTop from './components/BackToTop';
import Home from './pages/Home';
import PollDetail from './pages/PollDetail';
import AdminDashboard from './pages/AdminDashboard';
import Profile from './pages/Profile';
import About from './pages/About';
import Preloader from './components/Preloader';
import Footer from './components/Footer';
import { motion, AnimatePresence } from 'motion/react';
import React, { useState, useEffect } from 'react';

function AppContent() {
  const { currentPage, selectedPollSlug, navigateTo } = useNavigation();
  const currentYear = new Date().getFullYear();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 800); // reduced to 0.8s as requested for sub-1s feel
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <AnimatePresence>
        {loading && <Preloader />}
      </AnimatePresence>
      
      <div className="min-h-screen bg-[#F5F5F5] dark:bg-[#0A0A0A] relative overflow-x-hidden pb-20 md:pb-0 transition-colors duration-300">
      {/* Ugandan Watermark */}
      <div 
        className="fixed inset-0 pointer-events-none z-0 opacity-[0.03]"
        style={{
          backgroundImage: 'url("https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Flag_of_Uganda.svg/1200px-Flag_of_Uganda.svg.png")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'grayscale(0.8) contrast(1.2)'
        }}
      />
      
      <div className="relative z-10 flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow">
          <AnimatePresence mode="wait">
            {selectedPollSlug ? (
              <motion.div
                key={`poll-${selectedPollSlug}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <PollDetail slug={selectedPollSlug} onBack={() => navigateTo('home')} />
              </motion.div>
            ) : (
              <motion.div
                key={currentPage}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                {currentPage === 'home' && <Home />}
                {currentPage === 'polls' && <Home />}
                {currentPage === 'admin' && <AdminDashboard />}
                {currentPage === 'profile' && <Profile />}
                {currentPage === 'about' && <About />}
              </motion.div>
            )}
          </AnimatePresence>
        </main>
        
        <Footer />

        {!selectedPollSlug && <BottomNav />}
        <BackToTop />
        
        {/* Floating WhatsApp for Inquiries */}
        <a 
          href="https://wa.me/256751026975" 
          target="_blank" 
          rel="noopener noreferrer"
          className="fixed bottom-24 md:bottom-8 left-8 z-[100] w-10 h-10 bg-[#25D366] text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all group"
          title="Inquiry on WhatsApp"
        >
          <div className="absolute -top-10 left-0 bg-white text-slate-900 text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-slate-100 pointer-events-none">
            Inquiry Center
          </div>
          <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.148-.67-1.611-.918-2.21-.242-.588-.487-.51-.67-.52-.172-.007-.37-.01-.568-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
          </svg>
        </a>
      </div>
    </div>
  </>
);
}

import { HelmetProvider } from 'react-helmet-async';

export default function App() {
  return (
    <HelmetProvider>
      <ErrorBoundary>
        <ThemeProvider>
          <AuthProvider>
            <NavigationProvider>
              <AppContent />
            </NavigationProvider>
          </AuthProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </HelmetProvider>
  );
}
