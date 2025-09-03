import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import styled, { keyframes } from 'styled-components';

// Animation keyframes
const float = keyframes`
  0% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(-20px) rotate(5deg); }
  100% { transform: translateY(0px) rotate(0deg); }
`;

const pulse = keyframes`
  0% { opacity: 0.6; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.05); }
  100% { opacity: 0.6; transform: scale(1); }
`;

const LoadingContainer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: hsl(222.2 84% 4.9%);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const Logo = styled.div`
  font-size: 2.5rem;
  font-weight: bold;
  margin-bottom: 2rem;
  color: hsl(187 100% 50%);
  position: relative;
  z-index: 1;
`;

const ProgressBar = styled.div`
  width: 200px;
  height: 3px;
  background: hsl(217.2 32.6% 17.5%);
  border-radius: 2px;
  overflow: hidden;
  position: relative;
  z-index: 1;
`;

const Progress = styled.div`
  height: 100%;
  width: 0%;
  background: hsl(187 100% 50%);
  border-radius: 2px;
  position: relative;
  transition: width 0.3s ease;
`;

// Add floating particles
const particles = Array(15).fill(0);

const Particle = styled.div`
  position: absolute;
  width: 8px;
  height: 8px;
  background: rgba(96, 165, 250, 0.6);
  border-radius: 50%;
  pointer-events: none;
  box-shadow: 0 0 10px 2px rgba(96, 165, 250, 0.5);
`;

const LoadingScreen = ({ onComplete }: { onComplete: () => void }) => {
  const progressRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tl = gsap.timeline({
      onComplete: () => {
        gsap.to([logoRef.current, progressRef.current?.parentElement], {
          opacity: 0,
          duration: 0.3,
          onComplete,
        });
      },
    });

    // Fade in elements
    tl.fromTo(
      [logoRef.current, progressRef.current?.parentElement],
      { opacity: 0 },
      { opacity: 1, duration: 0.5 }
    );

    // Animate progress bar
    tl.to(progressRef.current, {
      width: '100%',
      duration: 2.5,
      ease: 'power2.inOut',
    }, '-=0.5');

    return () => {
      tl.kill();
    };
  }, [onComplete]);

  return (
    <LoadingContainer ref={containerRef}>
      <Logo ref={logoRef}>GENBOOK.AI</Logo>
      <ProgressBar>
        <Progress ref={progressRef} />
      </ProgressBar>
    </LoadingContainer>
  );
};

export default LoadingScreen;
