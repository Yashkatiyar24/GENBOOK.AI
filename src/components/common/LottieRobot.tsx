import React from 'react';
import Lottie, { LottieRefCurrentProps } from 'lottie-react';
import robotAnimation from '../../assets/lottie/robot.json';

export interface LottieRobotProps {
  className?: string;
  size?: number; // width/height px
  loop?: boolean;
  autoplay?: boolean;
  speed?: number; // playback speed multiplier
  onComplete?: () => void;
}

const LottieRobot: React.FC<LottieRobotProps> = ({
  className,
  size = 120,
  loop = true,
  autoplay = true,
  speed = 1,
  onComplete,
}) => {
  const lottieRef = React.useRef<LottieRefCurrentProps>(null);

  React.useEffect(() => {
    if (lottieRef.current) {
      lottieRef.current.setSpeed(speed);
    }
  }, [speed]);

  return (
    <div
      className={className}
      style={{ width: size, height: size }}
      aria-label="robot-animation"
      role="img"
    >
      <Lottie
        lottieRef={lottieRef}
        animationData={robotAnimation}
        loop={loop}
        autoplay={autoplay}
        onComplete={onComplete}
      />
    </div>
  );
};

export default LottieRobot;
