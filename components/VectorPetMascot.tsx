'use client';
import React from 'react';

interface VectorPetMascotProps {
  focusField: 'username' | 'password' | null;
  isIdle: boolean;
}

export const VectorPetMascot: React.FC<VectorPetMascotProps> = ({ focusField, isIdle }) => {
  const isCoveringEyes = focusField === 'password';
  const isLookingDown = focusField === 'username';

  return (
    <div className="relative w-full h-44 flex justify-center items-end select-none overflow-hidden rounded-t-[2.5rem] bg-gradient-to-b from-purple-100/90 via-purple-50/50 to-transparent pt-2">
      {/* Floating Thought Bubble when Idle for 2s */}
      <div
        className={`absolute top-2 right-4 sm:right-8 bg-purple-950 text-white text-[11px] font-bold px-3.5 py-1.5 rounded-2xl shadow-lg flex items-center gap-1.5 transition-all duration-300 transform z-30 ${
          isIdle && !focusField
            ? 'opacity-100 translate-y-0 scale-100'
            : 'opacity-0 translate-y-2 scale-90 pointer-events-none'
        }`}
      >
        <span>lại quên rồi chứ gì=)))</span>
        <div className="absolute -bottom-1 right-5 w-2.5 h-2.5 bg-purple-950 rotate-45 rounded-sm" />
      </div>

      <svg
        viewBox="0 0 300 160"
        className="w-72 h-44 overflow-hidden"
      >
        <defs>
          <linearGradient id="dogScarfGradV2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#9333ea" />
            <stop offset="100%" stopColor="#4f46e5" />
          </linearGradient>
          <linearGradient id="catBodyGradV2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f3e8ff" />
            <stop offset="100%" stopColor="#d8b4fe" />
          </linearGradient>
        </defs>

        {/* --- 🐶 SAMOYED DOG (LEFT CHARACTER) --- */}
        <g
          className={`transition-transform duration-300 origin-bottom ${
            isLookingDown ? 'translate-y-1' : isIdle ? 'animate-[bounce_3s_infinite]' : ''
          }`}
        >
          {/* Dog Body */}
          <path
            d="M 55 160 C 45 100 75 85 105 85 C 135 85 165 100 155 160 Z"
            fill="#f8fafc"
            stroke="#cbd5e1"
            strokeWidth="2"
          />

          {/* Dog Scarf */}
          <path
            d="M 68 108 C 85 120 125 120 142 108 C 148 118 132 130 105 132 C 78 130 62 118 68 108 Z"
            fill="url(#dogScarfGradV2)"
          />

          {/* Dog Ears (Proper Cute Fluffy Samoyed Ears at Top-Left and Top-Right of Head) */}
          <path
            d="M 72 38 C 62 18 80 18 90 35 Z"
            fill="#ffffff"
            stroke="#cbd5e1"
            strokeWidth="2"
            className={`transition-transform duration-300 origin-bottom-right ${
              isLookingDown ? 'rotate-3' : isCoveringEyes ? '-rotate-6' : ''
            }`}
          />
          <path
            d="M 138 38 C 148 18 130 18 120 35 Z"
            fill="#ffffff"
            stroke="#cbd5e1"
            strokeWidth="2"
            className={`transition-transform duration-300 origin-bottom-left ${
              isLookingDown ? '-rotate-3' : isCoveringEyes ? 'rotate-6' : ''
            }`}
          />
          <path d="M 74 37 C 67 22 80 22 87 35 Z" fill="#fbcfe8" />
          <path d="M 136 37 C 143 22 130 22 123 35 Z" fill="#fbcfe8" />

          {/* Dog Head */}
          <ellipse cx="105" cy="62" rx="42" ry="36" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2" />

          {/* Snout & Nose */}
          <ellipse cx="105" cy="72" rx="20" ry="14" fill="#f1f5f9" />
          <ellipse cx="105" cy="67" rx="9" ry="6" fill="#0f172a" />
          <ellipse cx="103" cy="65.5" rx="2.5" ry="1.5" fill="#ffffff" />

          {/* Mouth & Tongue */}
          <path d="M 105 73 L 105 77 M 99 76 C 102 79.5 108 79.5 111 76" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" fill="none" />
          <path d="M 102.5 77 C 102.5 81.5 107.5 81.5 107.5 77 Z" fill="#fb7185" />

          {/* Dog Eyes */}
          <g className="transition-all duration-300">
            <circle cx="87" cy="54" r="7" fill="#0f172a" />
            <circle cx="123" cy="54" r="7" fill="#0f172a" />

            <circle cx={isLookingDown ? 85.5 : 85} cy={isLookingDown ? 56.5 : 52} r="2.2" fill="#ffffff" />
            <circle cx={isLookingDown ? 121.5 : 121} cy={isLookingDown ? 56.5 : 52} r="2.2" fill="#ffffff" />
          </g>

          {/* Cheeks */}
          <ellipse cx="72" cy="66" rx="5" ry="3.5" fill="#fbcfe8" opacity="0.6" />
          <ellipse cx="138" cy="66" rx="5" ry="3.5" fill="#fbcfe8" opacity="0.6" />
        </g>


        {/* --- 🐱 LAVENDER CAT (RIGHT CHARACTER) --- */}
        <g
          className={`transition-transform duration-300 origin-bottom ${
            isLookingDown ? 'translate-y-1' : isIdle ? 'animate-[bounce_3s_infinite_0.5s]' : ''
          }`}
        >
          {/* Cat Body */}
          <path
            d="M 175 160 C 170 105 192 90 222 90 C 252 90 274 105 269 160 Z"
            fill="url(#catBodyGradV2)"
            stroke="#d8b4fe"
            strokeWidth="2"
          />

          {/* Cat Pointy Ears */}
          <polygon points="196,44 208,14 222,42" fill="#7e22ce" />
          <polygon points="242,42 256,14 268,44" fill="#7e22ce" />
          <polygon points="200,42 208,21 218,40" fill="#f472b6" />
          <polygon points="246,40 256,21 264,42" fill="#f472b6" />

          {/* Cat Head */}
          <ellipse cx="232" cy="60" rx="34" ry="30" fill="#f3e8ff" stroke="#e9d5ff" strokeWidth="2" />
          <ellipse cx="232" cy="68" rx="19" ry="14" fill="#ffffff" />

          {/* Whiskers */}
          <line x1="202" y1="65" x2="186" y2="62" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
          <line x1="202" y1="69" x2="186" y2="70" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
          <line x1="262" y1="65" x2="278" y2="62" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
          <line x1="262" y1="69" x2="278" y2="70" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />

          {/* Cat Nose & Mouth */}
          <polygon points="230,64 234,64 232,67" fill="#ec4899" />
          <path d="M 232 67 C 228 70 225 71 223 70 M 232 67 C 236 70 239 71 241 70" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" fill="none" />

          {/* Cat Eyes */}
          <g className="transition-all duration-300">
            <circle cx="216" cy="54" r="6.5" fill="#0f172a" />
            <circle cx="248" cy="54" r="6.5" fill="#0f172a" />

            <circle cx={isLookingDown ? 214.5 : 214} cy={isLookingDown ? 56.5 : 52} r="2" fill="#ffffff" />
            <circle cx={isLookingDown ? 246.5 : 246} cy={isLookingDown ? 56.5 : 52} r="2" fill="#ffffff" />
          </g>

          {/* Cheeks */}
          <ellipse cx="204" cy="65" rx="4.5" ry="3" fill="#fbcfe8" opacity="0.6" />
          <ellipse cx="260" cy="65" rx="4.5" ry="3" fill="#fbcfe8" opacity="0.6" />
        </g>


        {/* --- 🐾 FULL ARMS & HANDS (REACHES ALL THE WAY FROM SHOULDERS TO COVER EYES) --- */}
        <g
          className={`transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
            isCoveringEyes ? 'translate-y-0 opacity-100' : 'translate-y-28 opacity-0 pointer-events-none'
          }`}
        >
          {/* DOG FULL ARMS (White Fluffy Arms Connecting Shoulder to Paw) */}
          {/* Dog Left Arm */}
          <path
            d="M 62 135 Q 60 90 85 54"
            fill="none"
            stroke="#ffffff"
            strokeWidth="20"
            strokeLinecap="round"
          />
          <path
            d="M 62 135 Q 60 90 85 54"
            fill="none"
            stroke="#cbd5e1"
            strokeWidth="22"
            strokeLinecap="round"
            style={{ zIndex: -1 }}
          />
          <g transform="translate(85, 54)">
            <ellipse cx="0" cy="0" rx="15" ry="13" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2" />
            <circle cx="-6" cy="0" r="2.8" fill="#f472b6" />
            <circle cx="0" cy="-5" r="2.8" fill="#f472b6" />
            <circle cx="6" cy="0" r="2.8" fill="#f472b6" />
          </g>

          {/* Dog Right Arm */}
          <path
            d="M 148 135 Q 150 90 125 54"
            fill="none"
            stroke="#ffffff"
            strokeWidth="20"
            strokeLinecap="round"
          />
          <g transform="translate(125, 54)">
            <ellipse cx="0" cy="0" rx="15" ry="13" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2" />
            <circle cx="-6" cy="0" r="2.8" fill="#f472b6" />
            <circle cx="0" cy="-5" r="2.8" fill="#f472b6" />
            <circle cx="6" cy="0" r="2.8" fill="#f472b6" />
          </g>


          {/* CAT FULL ARMS (Lavender Arms Connecting Shoulder to Paw) */}
          {/* Cat Left Arm */}
          <path
            d="M 182 135 Q 185 90 214 54"
            fill="none"
            stroke="#e9d5ff"
            strokeWidth="18"
            strokeLinecap="round"
          />
          <g transform="translate(214, 54)">
            <ellipse cx="0" cy="0" rx="14" ry="12" fill="#e9d5ff" stroke="#c084fc" strokeWidth="2" />
            <circle cx="-5" cy="0" r="2.5" fill="#f472b6" />
            <circle cx="0" cy="-4.5" r="2.5" fill="#f472b6" />
            <circle cx="5" cy="0" r="2.5" fill="#f472b6" />
          </g>

          {/* Cat Right Arm */}
          <path
            d="M 262 135 Q 260 90 248 54"
            fill="none"
            stroke="#e9d5ff"
            strokeWidth="18"
            strokeLinecap="round"
          />
          <g transform="translate(248, 54)">
            <ellipse cx="0" cy="0" rx="14" ry="12" fill="#e9d5ff" stroke="#c084fc" strokeWidth="2" />
            <circle cx="-5" cy="0" r="2.5" fill="#f472b6" />
            <circle cx="0" cy="-4.5" r="2.5" fill="#f472b6" />
            <circle cx="5" cy="0" r="2.5" fill="#f472b6" />
          </g>
        </g>
      </svg>
    </div>
  );
};
