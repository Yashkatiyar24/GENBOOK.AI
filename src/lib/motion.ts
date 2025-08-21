import { SpringOptions } from 'framer-motion';

export const tiltSpring: SpringOptions = {
  type: 'spring',
  stiffness: 300,
  damping: 20,
  mass: 0.5,
};

export const hoverSpring: SpringOptions = {
  type: 'spring',
  stiffness: 220,
  damping: 18,
};

export const parallaxSpring: SpringOptions = {
  type: 'spring',
  stiffness: 120,
  damping: 20,
};

export const defaults = {
  maxTiltDeg: 8,
  scaleOnHover: 1.02,
  shadow: '0 10px 30px rgba(0,0,0,0.35)',
};
