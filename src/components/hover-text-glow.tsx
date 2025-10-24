"use client";

import * as React from "react";
import { motion } from "framer-motion";

export const HoverTextGlow = ({
  text = "Ben Cheesebrough",
  duration = 0.25,
  isWordComponent = false,
}: {
  text?: string;
  duration?: number;
  isWordComponent?: boolean;
}) => {
  const svgRef = React.useRef<SVGSVGElement>(null);
  const [coords, setCoords] = React.useState({ x: 0, y: 0 });
  const [hover, setHover] = React.useState(false);
  const [mask, setMask] = React.useState({ cx: "50%", cy: "50%" });
  const [isSmallScreen, setIsSmallScreen] = React.useState(false);

  // Check viewport size
  React.useEffect(() => {
    const checkScreenSize = () => {
      setIsSmallScreen(window.innerWidth < 640); // sm breakpoint
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Track cursor position relative to SVG
  React.useEffect(() => {
    if (!svgRef.current || coords.x === 0 && coords.y === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const cx = ((coords.x - rect.left) / rect.width) * 100;
    const cy = ((coords.y - rect.top) / rect.height) * 100;
    setMask({ cx: `${cx}%`, cy: `${cy}%` });
  }, [coords]);

  // Split text into words for small screens
  const words = text.split(" ");

  // For small screens, render each word as a separate component stacked vertically
  if (isSmallScreen && !isWordComponent && words.length > 1) {
    return (
      <div className="flex flex-col items-center justify-center space-y-0 p-0">
        {words.map((word, index) => (
          <HoverTextGlow key={index} text={word} duration={duration} isWordComponent={true} />
        ))}
      </div>
    );
  }

  return (
    <div className={isSmallScreen && isWordComponent ? "relative flex w-full items-center justify-center p-0 min-h-0" : "relative flex w-full items-center justify-center p-6 min-h-[200px]"}>
      <svg
        ref={svgRef}
        className="select-none"
        width="100%"
        height={isSmallScreen && isWordComponent ? 100 : 200}
        viewBox={isSmallScreen && isWordComponent ? "0 0 800 110" : "0 0 800 200"}
        xmlns="http://www.w3.org/2000/svg"
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onMouseMove={(e) => setCoords({ x: e.clientX, y: e.clientY })}
      >
        <defs>
          {/* gradient for stroke reveal */}
          <linearGradient id="textGradient" gradientUnits="userSpaceOnUse">
            {hover ? (
              <>
                <stop offset="0%" stopColor="hsl(250, 90%, 65%)" />
                <stop offset="25%" stopColor="hsl(260, 85%, 70%)" />
                <stop offset="50%" stopColor="hsl(280, 85%, 70%)" />
                <stop offset="75%" stopColor="hsl(310, 80%, 70%)" />
                <stop offset="100%" stopColor="hsl(340, 85%, 70%)" />
              </>
            ) : (
              <stop offset="0%" stopColor="hsl(var(--foreground))" />
            )}
          </linearGradient>

          {/* mask gradient that moves with cursor */}
          {/* <radialGradient
            id="revealMask"
            gradientUnits="userSpaceOnUse"
            r="20%"
            cx={mask.cx}
            cy={mask.cy}
          >
            <stop offset="0%" stopColor="white" />
            <stop offset="100%" stopColor="black" />
          </radialGradient> */}

          <mask id="textMask">
            <rect width="100%" height="100%" fill="url(#revealMask)" />
          </mask>
        </defs>

        {/* base text outline */}
        <motion.text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="middle"
          strokeWidth={isSmallScreen && isWordComponent ? 1.4 : 1.2}
          className={isSmallScreen && isWordComponent ? "font-bold font-[helvetica] fill-transparent text-8xl stroke-neutral-800 dark:stroke-neutral-300" : "font-bold font-[helvetica] fill-transparent text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl stroke-neutral-800 dark:stroke-neutral-300"}
          initial={{ strokeDashoffset: 1000, strokeDasharray: 1000 }}
          animate={{ strokeDashoffset: 0, strokeDasharray: 1000 }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
        >
          {text}
        </motion.text>

        {/* hover reveal gradient text */}
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="middle"
          stroke="url(#textGradient)"
          strokeWidth={isSmallScreen && isWordComponent ? 1.4 : 1.2}
          mask="url(#textMask)"
          className={isSmallScreen && isWordComponent ? "font-bold font-[helvetica] fill-transparent text-8xl" : "font-bold font-[helvetica] fill-transparent text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl"}
          style={{ opacity: hover ? 1 : 0.5, transition: "opacity 0.15s ease" }}
        >
          {text}
        </text>
      </svg>
    </div>
  );
};
