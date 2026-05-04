import React, { useState, useEffect } from 'react';
import { BackToTopIcon } from './CustomIcons';
import { motion, AnimatePresence } from 'motion/react';

export default function BackToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          onClick={scrollToTop}
          className="fixed bottom-20 md:bottom-8 right-6 z-50 p-2.5 bg-black/90 text-white rounded-xl shadow-2xl hover:bg-ug-red transition-all active:scale-90 border border-white/10 backdrop-blur-sm"
        >
          <BackToTopIcon size={18} />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
