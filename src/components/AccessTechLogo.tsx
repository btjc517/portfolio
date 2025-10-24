"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import Image from "next/image";

interface AccessTechLogoProps {
  className?: string;
  alt?: string;
  width?: number;
  height?: number;
}

export function AccessTechLogo({ 
  className = "", 
  alt = "AccessTechnologies logo",
  width = 65,
  height = 70
}: AccessTechLogoProps) {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);
  
  if (!mounted) {
    // Return a placeholder during SSR
    return (
      <div 
        className={className}
        style={{ width, height }}
      />
    );
  }
  
  // Use resolvedTheme to handle system theme preference
  const currentTheme = resolvedTheme || theme;
  const logoSrc = currentTheme === "dark" 
    ? "/AccessTechLogo-Dark.svg" 
    : "/AccessTechLogo-Light.svg";


  return (
    <Image
      src={logoSrc}
      alt={alt}
      width={width}
      height={height}
      className={className}
      key={currentTheme} // Force re-render when theme changes
    />
  );
}
