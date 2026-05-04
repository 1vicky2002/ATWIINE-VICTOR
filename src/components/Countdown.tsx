import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface CountdownProps {
  targetDate: string;
  className?: string;
}

export default function Countdown({ targetDate, className = "" }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  function calculateTimeLeft() {
    const difference = +new Date(targetDate) - +new Date();
    let timeLeft = {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0
    };

    if (difference > 0) {
      timeLeft = {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60)
      };
    }

    return timeLeft;
  }

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="flex flex-col items-center">
        <span className="text-xl md:text-2xl font-black">{timeLeft.days}</span>
        <span className="text-[8px] uppercase tracking-widest font-bold opacity-50">Days</span>
      </div>
      <span className="text-xl md:text-2xl font-black opacity-20">:</span>
      <div className="flex flex-col items-center">
        <span className="text-xl md:text-2xl font-black">{timeLeft.hours.toString().padStart(2, '0')}</span>
        <span className="text-[8px] uppercase tracking-widest font-bold opacity-50">Hrs</span>
      </div>
      <span className="text-xl md:text-2xl font-black opacity-20">:</span>
      <div className="flex flex-col items-center">
        <span className="text-xl md:text-2xl font-black">{timeLeft.minutes.toString().padStart(2, '0')}</span>
        <span className="text-[8px] uppercase tracking-widest font-bold opacity-50">Min</span>
      </div>
      <span className="text-xl md:text-2xl font-black opacity-20">:</span>
      <div className="flex flex-col items-center">
        <span className="text-xl md:text-2xl font-black text-[#D90000]">{timeLeft.seconds.toString().padStart(2, '0')}</span>
        <span className="text-[8px] uppercase tracking-widest font-bold opacity-50">Sec</span>
      </div>
    </div>
  );
}
