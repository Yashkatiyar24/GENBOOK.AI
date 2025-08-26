import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Environment } from '@react-three/drei';

function SpinningCube() {
  const ref = useRef<any>(null);
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (ref.current) {
      ref.current.rotation.x = t * 0.3;
      ref.current.rotation.y = t * 0.45;
    }
  });
  return (
    <mesh ref={ref} castShadow receiveShadow>
      <boxGeometry args={[0.9, 0.9, 0.9]} />
      <meshStandardMaterial color="#22d3ee" metalness={0.2} roughness={0.3} />
    </mesh>
  );
}

export default function FloatingObject() {
  return (
    <Canvas shadows dpr={[1, 2]} camera={{ position: [2, 2, 3], fov: 50 }}>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} castShadow />
      <Environment preset="city" />
      <Float speed={1.2} rotationIntensity={0.4} floatIntensity={1.2}>
        <SpinningCube />
      </Float>
    </Canvas>
  );
}
