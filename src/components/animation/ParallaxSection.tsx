import React, { PropsWithChildren } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { parallaxSpring } from '../../lib/motion';

interface ParallaxSectionProps extends PropsWithChildren {
  /** Strength of Z-depth illusion in px (mapped to translateY/scale subtly) */
  depth?: number;
  className?: string;
}

export default function ParallaxSection({ depth = 30, className = '', children }: ParallaxSectionProps) {
  // Use viewport scroll to create subtle parallax
  const { scrollYProgress } = useScroll();
  // Map to small translateY and scale for depth illusion (GPU-friendly)
  const y = useTransform(scrollYProgress, [0, 1], [0, depth]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.02]);

  return (
    <motion.section
      className={className}
      style={{
        y,
        scale,
        willChange: 'transform',
        transformPerspective: 800,
      }}
      transition={parallaxSpring}
    >
      {children}
    </motion.section>
  );
}
