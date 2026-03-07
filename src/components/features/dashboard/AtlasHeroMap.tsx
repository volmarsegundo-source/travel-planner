"use client";

export function AtlasHeroMap() {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 800 400"
        className="h-full w-full text-atlas-gold/10"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        {/* Simplified decorative world map silhouette */}
        <g fill="currentColor">
          {/* North America */}
          <path d="M120 120 Q140 100 180 105 Q200 110 210 130 Q220 150 200 170 Q180 180 160 175 Q130 170 120 150 Z" />
          {/* South America */}
          <path d="M180 200 Q195 190 205 200 Q215 220 210 260 Q200 290 185 300 Q175 280 170 250 Q165 220 180 200 Z" />
          {/* Europe */}
          <path d="M350 100 Q370 90 390 100 Q400 110 395 130 Q380 140 360 135 Q345 125 350 100 Z" />
          {/* Africa */}
          <path d="M360 160 Q380 150 400 160 Q410 180 405 220 Q395 260 380 280 Q365 270 355 240 Q345 200 360 160 Z" />
          {/* Asia */}
          <path d="M430 80 Q480 70 530 85 Q570 100 590 130 Q580 150 550 145 Q520 140 490 135 Q460 130 440 120 Q425 110 430 80 Z" />
          {/* Australia */}
          <path d="M560 250 Q590 240 610 250 Q625 265 620 285 Q600 295 580 290 Q555 275 560 250 Z" />
          {/* Dotted routes */}
          <circle cx="165" cy="140" r="3" />
          <circle cx="210" cy="165" r="3" />
          <circle cx="280" cy="155" r="3" />
          <circle cx="370" cy="115" r="3" />
          <circle cx="500" cy="110" r="3" />
          <circle cx="590" cy="260" r="3" />
        </g>
      </svg>
    </div>
  );
}
