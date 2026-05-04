import React from 'react';
import { motion } from 'motion/react';

export default function Preloader() {
  const bubbles = [
    { color: 'bg-ug-black', delay: 0 },
    { color: 'bg-ug-yellow', delay: 0.05 },
    { color: 'bg-ug-red', delay: 0.1 },
    { color: 'bg-ug-black', delay: 0.15 },
    { color: 'bg-ug-yellow', delay: 0.2 },
    { color: 'bg-ug-red', delay: 0.25 }
  ];

  return (
    <motion.div 
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
      className="fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center overflow-hidden"
    >
      {/* Dynamic Background Bubbles */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ 
              opacity: 0, 
              scale: 0,
              x: Math.random() * 100 - 50 + '%',
              y: '110%' 
            }}
            animate={{ 
              opacity: [0, 0.2, 0],
              scale: [0, 1.5, 0.5],
              y: '-10%'
            }}
            transition={{ 
              duration: 3 + Math.random() * 2, 
              repeat: Infinity,
              delay: Math.random() * 2,
              ease: "linear"
            }}
            className={`absolute w-32 h-32 rounded-full blur-3xl ${
              i % 3 === 0 ? 'bg-ug-black' : i % 3 === 1 ? 'bg-ug-yellow' : 'bg-ug-red'
            }`}
          />
        ))}
      </div>

      <div className="relative z-10 flex flex-col items-center">
        {/* Main Logo Animation */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="mb-12"
        >
          <img src="/favicon.ico" alt="Uganda Votes" className="w-24 h-24 rounded-2xl shadow-2xl" />
        </motion.div>

        {/* Bubble Loading Animation */}
        <div className="flex gap-4">
          {bubbles.map((bubble, i) => (
            <motion.div
              key={i}
              initial={{ y: 0 }}
              animate={{ y: [0, -20, 0] }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                delay: bubble.delay,
                ease: "easeInOut"
              }}
              className={`w-4 h-4 rounded-full ${bubble.color} shadow-lg`}
            />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-8 text-center"
        >
          <h1 className="text-2xl font-display font-black tracking-tighter text-slate-900 italic">
            Uganda <span className="text-ug-red">Votes</span>
          </h1>
          <p className="text-[10px] font-bold text-white bg-slate-900 px-2 py-0.5 rounded-full inline-block mt-1">
            {new Date().getFullYear()}
          </p>
          <p className="text-[10px] font-mono text-slate-400 uppercase tracking-[0.3em] mt-2">
            Securing Your Choice...
          </p>
        </motion.div>
      </div>

      {/* Progress Line */}
      <div className="absolute bottom-0 left-0 w-full h-1.5 bg-slate-100">
        <motion.div 
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: 1, ease: "easeInOut" }}
          className="h-full bg-ug-red shadow-[0_0_15px_rgba(217,0,0,0.5)]"
        />
      </div>
    </motion.div>
  );
}
