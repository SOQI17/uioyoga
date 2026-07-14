import { Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Float, Sphere, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { motion } from 'framer-motion';

function MeditationOrb() {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.getElapsedTime() * 0.1;
      meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.15;
    }
  });

  return (
    <Float speed={1.5} rotationIntensity={0.5} floatIntensity={1.5}>
      <Sphere ref={meshRef} args={[1.5, 128, 128]} position={[0, 0, 0]}>
        <MeshDistortMaterial 
          color="#c5a059" // Warm wood/bronze base color
          emissive="#d4af37" // Elegant gold glow
          emissiveIntensity={0.3}
          attach="material" 
          distort={0.4} 
          speed={1.5} 
          roughness={0.1}
          metalness={0.5}
          clearcoat={1}
          clearcoatRoughness={0.1}
        />
      </Sphere>
    </Float>
  );
}

export function Experience() {
  return (
    <div className="relative min-h-screen w-full bg-gris overflow-hidden flex flex-col">
      {/* UI Overlay */}
      <div className="absolute inset-x-0 top-32 z-10 text-center pointer-events-none flex flex-col items-center">
        <motion.span 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 block text-[10px] font-bold tracking-[0.3em] uppercase text-arena/70"
        >
          Respiración
        </motion.span>
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="font-serif text-5xl md:text-7xl text-marfil font-medium mb-4 tracking-tight"
        >
          UIO Room
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-arena/50 font-light tracking-wide text-sm md:text-base max-w-md px-4"
        >
          Explora con el mouse. Encuentra tu centro. Sincroniza tu respiración con el movimiento.
        </motion.p>
      </div>

      <div className="flex-1 w-full h-full min-h-[600px]">
        <Canvas camera={{ position: [0, 0, 8], fov: 45 }}>
          <Suspense fallback={null}>
            <ambientLight intensity={0.2} />
            <directionalLight position={[10, 10, 5]} intensity={1.5} color="#FAF8F4" />
            <pointLight position={[-10, -10, -5]} intensity={1} color="#9CAF88" />
            
            <MeditationOrb />
            
            <Environment preset="city" background blur={0.5} />
            <OrbitControls 
              enableZoom={false} 
              enablePan={false}
              autoRotate
              autoRotateSpeed={0.3}
              maxPolarAngle={Math.PI / 2 + 0.3}
              minPolarAngle={Math.PI / 2 - 0.3}
            />
          </Suspense>
        </Canvas>
      </div>
      
      <div className="absolute bottom-12 inset-x-0 flex justify-center z-10 pointer-events-none">
        <div className="w-px h-16 bg-gradient-to-b from-transparent via-arena/50 to-transparent"></div>
      </div>
    </div>
  );
}
