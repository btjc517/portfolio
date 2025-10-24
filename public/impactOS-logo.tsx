// ImpactOS brand logo component
// Renders the ImpactOS SVG mark with configurable size and className

"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

/**
 * Displays the ImpactOS logo as an inline SVG.
 * Allows sizing and custom class names for layout and styling.
 * @param size - Pixel size for width/height (defaults to 26 to match original artboard)
 * @param className - Optional class names for external styling
 * @param title - Accessible label for screen readers
 * @returns SVG element representing the ImpactOS logo
 */
export function ImpactOSLogo({
  size = 26,
  className = "",
  title = "ImpactOS logo",
  pulseKey,
  pulseColor,
}: {
  size?: number;
  className?: string;
  title?: string;
  /**
   * Optional sync key to re-start both animations simultaneously.
   * Change this value to re-mount and re-sync the pulse + ripple.
   */
  pulseKey?: number | string;
  /**
   * Optional pulse color override for the ripple effect only.
   * If omitted, ripple uses `var(--impactos-pulse-color, currentColor)` so a parent
   * can set `--impactos-pulse-color` while leaves/dots/center use `currentColor`.
   */
  pulseColor?: string;
}) {
  // Default brand color; used unless overridden by Tailwind text/fill classes
  const defaultLogoColor = "#62FF00";
  // If caller passes a Tailwind text-*/fill-* class, let that control color; otherwise apply default
  const hasTailwindColor = /(\s|^)(text-|fill-)/.test(className);
  // Build style so we can optionally inject CSS var for pulse color without forcing it
  const svgStyleTemp: Record<string, string> = {};
  if (!hasTailwindColor) {
    // Fallback to brand color when no Tailwind color classes are present
    svgStyleTemp.color = defaultLogoColor;
  }
  if (pulseColor) {
    // Allow parent to override via prop; alternatively parent may set this CSS var on a wrapper
    svgStyleTemp["--impactos-pulse-color"] = pulseColor;
  }
  const svgStyle = Object.keys(svgStyleTemp).length ? (svgStyleTemp as any) : undefined;
  // Animation geometry constants for center and ripple (derived from rounded-corner SVG)
  const centerX = 100.972;
  const centerY = 100.003;
  const baseRadius = 11.7647;
  // Subtle pulse/slam timing tuned for a calm rhythm with a crisp release


  const cycleDuration = 2.4; // seconds


  const slamAt = 0.5 * cycleDuration; // when the quick snap happens within cycle
  const rippleDuration = 0.3; // outward ripple visible time
  // Drift amount for petals/dots in viewBox units (subtle)
  const driftOffset = 4.5;
  const leafDelay = 0.25;
  const highlightsDelay = 0.15;
  const dotsDelay = 0.3;

  const amplifyDelay = 0.5;

  // opacity for each element
  const topLeafOpacity = 0.8;
  const bottomLeafOpacity = 0.8;
  const rightLeafOpacity = 0.8;
  const leftLeafOpacity = 0.8;
  const highlightsOpacity = 0.7;
  const dotsOpacity = 0.6;

  // Render the provided SVG paths exactly as designed to preserve brand fidelity
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title}
      className={cn("overflow-visible", className)}
      style={svgStyle}
    >
      {/* Primary leaf circles and petals - rounded corner variant with synchronized drift */}
      {/* Top leaf group */}
      <motion.g
        key={`top-${pulseKey ?? "default"}`}
        animate={{ y: [0, driftOffset, 0] }}
        transition={{ duration: cycleDuration, ease: ["easeInOut", [0.2, 0.8, 0.2, 1.0], "easeOut"], repeat: Infinity, delay: leafDelay * amplifyDelay }}
        style={{ transformOrigin: `${centerX}px ${centerY}px` }}
      >
        <path d="M124.485 46.6966C124.485 35.2941 109.481 12.5708 102.679 2.4883C100.436 -0.829433 101.474 -0.829433 99.2313 2.4883C92.4299 12.5708 77.4258 35.2941 77.4258 46.6966C77.4258 58.8235 87.9773 68.6275 100.955 68.6275C113.933 68.6275 124.485 58.8235 124.485 46.6966Z" fill="currentColor" fillOpacity={topLeafOpacity} />
      </motion.g>

      {/* Bottom leaf group */}
      <motion.g
        key={`bottom-${pulseKey ?? "default"}`}
        animate={{ y: [0, -driftOffset, 0] }}
        transition={{ duration: cycleDuration, ease: ["easeInOut", [0.2, 0.8, 0.2, 1.0], "easeOut"], repeat: Infinity, delay: leafDelay * amplifyDelay }}
        style={{ transformOrigin: `${centerX}px ${centerY}px` }}
      >
        <path d="M124.485 153.303C124.485 164.706 109.481 187.429 102.679 197.512C100.436 200.829 101.474 200.829 99.2313 197.512C92.4299 187.429 77.4258 164.706 77.4258 153.303C77.4258 141.176 87.9773 131.373 100.955 131.373C113.933 131.373 124.485 141.176 124.485 153.303Z" fill="currentColor" fillOpacity={bottomLeafOpacity} />
      </motion.g>

      {/* Right leaf  */}
      <motion.g
        key={`right-${pulseKey ?? "default"}`}
        animate={{ x: [0, -driftOffset, 0] }}
        transition={{ duration: cycleDuration, ease: ["easeInOut", [0.2, 0.8, 0.2, 1.0], "easeOut"], repeat: Infinity, delay: leafDelay * amplifyDelay }}
        style={{ transformOrigin: `${centerX}px ${centerY}px` }}
      >
        <path d="M153.303 123.531C164.706 123.531 187.429 108.526 197.512 101.725C200.829 99.4823 200.829 100.52 197.512 98.2772C187.429 91.4758 164.706 76.4717 153.303 76.4717C141.176 76.4717 131.373 87.0232 131.373 100.001C131.373 112.979 141.176 123.531 153.303 123.531Z" fill="currentColor" fillOpacity={rightLeafOpacity} />
      </motion.g>

      {/* Left leaf */}
      <motion.g
        key={`left-${pulseKey ?? "default"}`}
        animate={{ x: [0, driftOffset, 0] }}
        transition={{ duration: cycleDuration, ease: ["easeInOut", [0.2, 0.8, 0.2, 1.0], "easeOut"], repeat: Infinity, delay: leafDelay * amplifyDelay }}
        style={{ transformOrigin: `${centerX}px ${centerY}px` }}
      >
        <path d="M46.6966 123.531C35.2941 123.531 12.5708 108.526 2.4883 101.725C-0.829433 99.4823 -0.829433 100.52 2.4883 98.2772C12.5708 91.4758 35.2941 76.4717 46.6966 76.4717C58.8235 76.4717 68.6275 87.0232 68.6275 100.001C68.6275 112.979 58.8235 123.531 46.6966 123.531Z" fill="currentColor" fillOpacity={leftLeafOpacity} />
      </motion.g>

      {/* Highlights scale in sync with accent dots */}
      <motion.g
        key={`highlights-${pulseKey ?? "default"}`}
        animate={{ scale: [1.1, 1, 1.1] }}
        transition={{ duration: cycleDuration, ease: ["easeInOut", [0.2, 0.8, 0.2, 1.0], "easeOut"], repeat: Infinity, delay: highlightsDelay * amplifyDelay }}
        style={{ transformOrigin: `${centerX}px ${centerY}px` }}
      >
        <path d="M117.524 84.3671C116.804 84.5936 116.166 83.9557 116.392 83.2355C117.436 79.9166 120.307 72.1332 125.634 66.8061C130.962 61.4789 138.745 58.6079 142.064 57.5639C142.784 57.3374 143.422 57.9753 143.195 58.6955C142.151 62.0144 139.28 69.7978 133.953 75.125C128.626 80.4521 120.843 83.3231 117.524 84.3671Z" fill="currentColor" fillOpacity={highlightsOpacity} />    
        <path d="M117.524 116.382C116.804 116.156 116.166 116.794 116.392 117.514C117.436 120.833 120.307 128.616 125.634 133.943C130.962 139.271 138.745 142.142 142.064 143.186C142.784 143.412 143.422 142.774 143.195 142.054C142.151 138.735 139.28 130.952 133.953 125.625C128.626 120.297 120.843 117.426 117.524 116.382Z" fill="currentColor" fillOpacity={highlightsOpacity} />       
        <path d="M83.2262 84.3671C83.9463 84.5936 84.5843 83.9557 84.3578 83.2355C83.3138 79.9166 80.4428 72.1332 75.1156 66.8061C69.7884 61.4789 62.0051 58.6079 58.6861 57.5639C57.966 57.3374 57.3281 57.9753 57.5546 58.6955C58.5985 62.0144 61.4695 69.7978 66.7967 75.125C72.1239 80.4521 79.9073 83.3231 83.2262 84.3671Z" fill="currentColor" fillOpacity={highlightsOpacity} />
        <path d="M83.2262 116.382C83.9463 116.156 84.5843 116.794 84.3578 117.514C83.3138 120.833 80.4428 128.616 75.1156 133.943C69.7884 139.271 62.0051 142.142 58.6861 143.186C57.966 143.412 57.3281 142.774 57.5546 142.054C58.5985 138.735 61.4695 130.952 66.7967 125.625C72.1239 120.297 79.9073 117.426 83.2262 116.382Z" fill="currentColor" fillOpacity={highlightsOpacity} />
      </motion.g>
      
      {/* Subtle expanding ripple emitted at slam moment */}
      <motion.circle
        key={`ripple-${pulseKey ?? "default"}`}
        cx={centerX}
        cy={centerY}
        r={baseRadius}
        fill="none"
        stroke="currentColor"
        strokeOpacity={0.25}
        strokeWidth={4}
        vectorEffect="non-scaling-stroke"
        // Pulse ripple uses CSS var so parent can set a distinct pulse color
        style={{ filter: "blur(12px)", stroke: "var(--impactos-pulse-color, currentColor)" }}
        initial={{ r: baseRadius, opacity: 0 }}
        animate={{ r: baseRadius * 10.5, opacity: [0.9, 0] }}
        transition={{
          duration: rippleDuration,
          ease: "easeOut",
          repeat: Infinity,
          // Keep the total period equal to cycleDuration to avoid drift
          repeatDelay: Math.max(0, cycleDuration - rippleDuration),
          delay: slamAt + 0.1,
        }}
      />

      {/* Central node w/ slam pulse */}
      <motion.circle
        key={`center-${pulseKey ?? "default"}`}
        cx={centerX}
        cy={centerY}
        fill="currentColor"
        fillOpacity={0.85}
        initial={{ r: baseRadius }}
        // animate={{ r: [baseRadius, baseRadius * 1.24, baseRadius * 1.55, baseRadius] }}
        // transition={{
        //   duration: cycleDuration,
        //   times: [0, 0.68, 0.76, 0.8],
        //   ease: ["easeInOut", "easeInOut", [0.2, 0.8, 0.2, 1.0], "easeOut"],
        //   repeat: Infinity,
        // }}
        animate={{ r: [baseRadius, baseRadius * 1.4, baseRadius] }}
        transition={{
          duration: cycleDuration,
        //   times: [0, 0.68, 0.76, 0.8],
        //   ease: ["easeInOut", "easeInOut", [0.2, 0.8, 0.2, 1.0], "easeOut"],
          ease: ["easeInOut", [0.2, 0.8, 0.2, 1.0], "easeOut"],
          repeat: Infinity,
        }}
      />

      {/* Accent dots drifting subtly with the pulse */}
      <motion.g
        key={`dots-${pulseKey ?? "default"}`}
        animate={{ scale: [1.1, 1, 1.1] }}
        transition={{ duration: cycleDuration, ease: ["easeInOut", [0.2, 0.8, 0.2, 1.0], "easeOut"], repeat: Infinity, delay: dotsDelay * amplifyDelay }}
        style={{ transformOrigin: `${centerX}px ${centerY}px` }}
      >
        <circle cx="5" cy="5" r="5" transform="matrix(0 1 1 0 51.7773 35.7856)" fill="currentColor" fillOpacity={dotsOpacity} />
        <circle cx="5" cy="5" r="5" transform="matrix(0 1 1 0 37.7773 49.7856)" fill="currentColor" fillOpacity={dotsOpacity} />    
        <circle cx="5" cy="5" r="5" transform="matrix(0 1 1 0 51.7773 152.273)" fill="currentColor" fillOpacity={dotsOpacity} />
        <circle cx="5" cy="5" r="5" transform="matrix(0 1 1 0 37.7773 138.273)" fill="currentColor" fillOpacity={dotsOpacity} />
        <circle cx="5" cy="5" r="5" transform="matrix(0 1 1 0 153.27 49.7856)" fill="currentColor" fillOpacity={dotsOpacity} />
        <circle cx="5" cy="5" r="5" transform="matrix(0 1 1 0 139.27 35.7856)" fill="currentColor" fillOpacity={dotsOpacity} />
        <circle cx="5" cy="5" r="5" transform="matrix(0 1 1 0 139.27 152.273)" fill="currentColor" fillOpacity={dotsOpacity} />
        <circle cx="5" cy="5" r="5" transform="matrix(0 1 1 0 153.27 138.273)" fill="currentColor" fillOpacity={dotsOpacity} />
      </motion.g>
    </svg>
  );
}