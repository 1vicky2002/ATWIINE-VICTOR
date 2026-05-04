import React from 'react';

export const AdminIcon = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 512 512" className={className} xmlns="http://www.w3.org/2000/svg">
    <path fill="currentColor" d="M213.3 384c0-87 65.2-158.7 149.3-169.2v-1.5c5.5-8 21.3-21.3 21.3-42.7s-21.3-42.7-21.3-53.3C362.7 32 319.2 0 256 0c-60.5 0-106.7 32-106.7 117.3c0 10.7-21.3 32-21.3 53.3s15.2 35.4 21.3 42.7c0 0 0 21.3 10.7 53.3c0 10.7 21.3 21.3 32 32c0 10.7 0 21.3-10.7 42.7L64 362.7C21.3 373.3 0 448 0 512h271.4c-35.5-31.3-58.1-77-58.1-128M384 256c-70.7 0-128 57.3-128 128s57.3 128 128 128s128-57.3 128-128s-57.3-128-128-128m85.3 149.3h-64v64h-42.7v-64h-64v-42.7h64v-64h42.7v64h64z"/>
  </svg>
);

export const VoteTickIcon = ({ size = 16, className = "" }: { size?: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" className={className} xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="#d80404" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9">
      <path d="m14.25 8.75c-.5 2.5-2.3849 4.85363-5.03069 5.37991-2.64578.5263-5.33066-.7044-6.65903-3.0523-1.32837-2.34784-1.00043-5.28307.81336-7.27989 1.81379-1.99683 4.87636-2.54771 7.37636-1.54771"/>
      <polyline points="5.75 7.75 8.25 10.25 14.25 3.75"/>
    </g>
  </svg>
);

export const ChatIcon = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg">
    <g fill="none">
      <path fill="url(#SVG4MvAEbGB)" fillRule="evenodd" d="M22 13.5a7.5 7.5 0 1 0-4.411 6.836c1.258.29 2.613.54 3.236.652a.996.996 0 0 0 1.153-1.17a68 68 0 0 0-.681-3.143A7.5 7.5 0 0 0 22 13.5M14.517 18h-.034z" clipRule="evenodd"/>
      <path fill="url(#SVGwY5FYTIH)" fillRule="evenodd" d="M2 10.5a7.5 7.5 0 1 1 4.411 6.836c-1.258.29-2.613.54-3.236.652a.996.996 0 0 1-1.153-1.17a68 68 0 0 1 .681-3.143A7.5 7.5 0 0 1 2 10.5M9.483 15h.034z" clipRule="evenodd"/>
      <defs>
        <radialGradient id="SVG4MvAEbGB" cx="0" cy="0" r="1" gradientTransform="rotate(49.244 -5.402 17.032)scale(10.5735 10.5821)" gradientUnits="userSpaceOnUse">
          <stop offset=".63" stopColor="#0beb0f"/>
          <stop offset=".85" stopColor="#6553c9"/>
          <stop offset="1" stopColor="#2e00ef"/>
        </radialGradient>
        <linearGradient id="SVGwY5FYTIH" x1="2" x2="17.003" y1="3" y2="18" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0fafff"/>
          <stop offset="1" stopColor="#a30df3"/>
        </linearGradient>
      </defs>
    </g>
  </svg>
);

export const StatsIcon = ({ size = 16, className = "" }: { size?: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" className={className} xmlns="http://www.w3.org/2000/svg">
    <g fill="none">
      <path fill="url(#SVGdMr29cBu)" d="M6 3a2 2 0 1 1 4 0v10a2 2 0 1 1-4 0z"/>
      <path fill="url(#SVGmpEUvbrK)" d="M13 5a2 2 0 0 0-2 2v6a2 2 0 1 0 4 0V7a2 2 0 0 0-2-2"/>
      <path fill="url(#SVGGoDaDb2V)" d="M3 7a2 2 0 0 0-2 2v4a2 2 0 1 0 4 0V9a2 2 0 0 0-2-2"/>
      <defs>
        <linearGradient id="SVGdMr29cBu" x1="9.667" x2="7.529" y1="12.433" y2=".854" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6d37cd"/>
          <stop offset="1" stopColor="#ea71ef"/>
        </linearGradient>
        <linearGradient id="SVGmpEUvbrK" x1="14.667" x2="13.558" y1="13.167" y2="4.76" gradientUnits="userSpaceOnUse">
          <stop stopColor="#e23cb4"/>
          <stop offset="1" stopColor="#ea71ef"/>
        </linearGradient>
        <linearGradient id="SVGGoDaDb2V" x1="1.5" x2="9.148" y1="7.333" y2="11.857" gradientUnits="userSpaceOnUse">
          <stop stopColor="#36dff1"/>
          <stop offset="1" stopColor="#0078d4"/>
        </linearGradient>
      </defs>
    </g>
  </svg>
);

export const ViewsIcon = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg">
    <path fill="#ff0606" fillOpacity="0.25" d="M20.188 10.934c.388.472.582.707.582 1.066s-.194.594-.582 1.066C18.768 14.79 15.636 18 12 18s-6.768-3.21-8.188-4.934c-.388-.472-.582-.707-.582-1.066s.194-.594.582-1.066C5.232 9.21 8.364 6 12 6s6.768 3.21 8.188 4.934"/>
    <circle cx="12" cy="12" r="3" fill="#ff0606"/>
  </svg>
);

export const ProfileIcon = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 80 80" className={className} xmlns="http://www.w3.org/2000/svg">
    <g fill="none" strokeLinejoin="round" strokeWidth="4">
      <path fill="#f2c94c" stroke="#f2c94c" strokeLinecap="square" d="M60 70H20a4 4 0 0 1-4-4a15.87 15.87 0 0 1 10.3-14.86l1.23-.462a35.53 35.53 0 0 1 24.94 0l1.23.462A15.87 15.87 0 0 1 64 66a4 4 0 0 1-4 4Z"/>
      <path fill="#f2994a" stroke="#f2994a" strokeLinecap="round" d="M33.902 38.867a13.347 13.347 0 0 0 19.15-9.08l.223-1.044a14.2 14.2 0 0 0-2.51-11.466l-.36-.48a12.992 12.992 0 0 0-20.81 0l-.36.48a14.2 14.2 0 0 0-2.51 11.465l.223 1.046a13.35 13.35 0 0 0 6.953 9.08"/>
    </g>
  </svg>
);

export const BackToTopIcon = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="#ff0606" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
      <path strokeDasharray="20" d="M12 21l0 -17.5">
        <animate fill="freeze" attributeName="stroke-dashoffset" dur="0.63s" values="20;0"/>
      </path>
      <path strokeDasharray="12" strokeDashoffset="12" d="M12 3l7 7M12 3l-7 7">
        <animate fill="freeze" attributeName="stroke-dashoffset" begin="0.63s" dur="0.42s" to="0"/>
      </path>
    </g>
  </svg>
);
