import React, { useRef, useState, useMemo } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { tiltSpring, defaults } from '../../lib/motion';

interface TiltCardProps extends React.HTMLAttributes<HTMLDivElement> {
  maxTiltDeg?: number;
  scaleOnHover?: number;
  shadow?: string;
}

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

export default function TiltCard({
  children,
  className = '',
  maxTiltDeg = defaults.maxTiltDeg,
  scaleOnHover = defaults.scaleOnHover,
  shadow = defaults.shadow,
  ...rest
}: TiltCardProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [hovered, setHovered] = useState(false);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rx = useSpring(useTransform(y, [0, 1], [maxTiltDeg, -maxTiltDeg]), tiltSpring);
  const ry = useSpring(useTransform(x, [0, 1], [-maxTiltDeg, maxTiltDeg]), tiltSpring);
  const s = useSpring(hovered ? scaleOnHover : 1, tiltSpring);

  const handleMouseMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = clamp((e.clientX - rect.left) / rect.width, 0, 1);
    const py = clamp((e.clientY - rect.top) / rect.height, 0, 1);
    x.set(px);
    y.set(py);
  };

  const willChange = useMemo(() => 'transform', []);

  return (
    <motion.div
      ref={ref}
      className={className}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        transformStyle: 'preserve-3d',
        willChange,
        boxShadow: hovered ? shadow : 'none',
        rotateX: rx,
        rotateY: ry,
        scale: s,
      }}
      {...rest}
    >
      {/* Inner layer to keep content crisp */}
      <div style={{ transform: 'translateZ(1px)' }}>{children}</div>
    </motion.div>
  );
}
