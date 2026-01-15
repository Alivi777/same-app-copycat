import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface ParticleFieldProps {
  count?: number;
}

export function ParticleField({ count = 200 }: ParticleFieldProps) {
  const pointsRef = useRef<THREE.Points>(null);
  
  const particles = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const speeds = new Float32Array(count);
    
    const colorPalette = [
      new THREE.Color("#22d3ee"),
      new THREE.Color("#d946ef"),
      new THREE.Color("#f59e0b"),
      new THREE.Color("#10b981"),
    ];
    
    for (let i = 0; i < count; i++) {
      // Random position in a box area
      positions[i * 3] = (Math.random() - 0.5) * 30;
      positions[i * 3 + 1] = Math.random() * 8 + 0.5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20;
      
      // Random color from palette
      const color = colorPalette[Math.floor(Math.random() * colorPalette.length)];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
      
      // Random sizes
      sizes[i] = Math.random() * 0.1 + 0.02;
      
      // Random speeds
      speeds[i] = Math.random() * 0.5 + 0.2;
    }
    
    return { positions, colors, sizes, speeds };
  }, [count]);

  useFrame((state) => {
    if (!pointsRef.current) return;
    
    const positions = pointsRef.current.geometry.attributes.position.array as Float32Array;
    const time = state.clock.elapsedTime;
    
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      
      // Gentle floating motion
      positions[i3 + 1] += Math.sin(time * particles.speeds[i] + i) * 0.002;
      positions[i3] += Math.cos(time * particles.speeds[i] * 0.5 + i) * 0.001;
      
      // Reset if too high
      if (positions[i3 + 1] > 10) {
        positions[i3 + 1] = 0.5;
      }
    }
    
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  // Custom shader material for glowing particles
  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
      },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        varying float vAlpha;
        
        void main() {
          vColor = color;
          vAlpha = 0.5 + sin(position.y * 2.0) * 0.3;
          
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        
        void main() {
          // Create circular particles with glow
          vec2 center = gl_PointCoord - 0.5;
          float dist = length(center);
          
          if (dist > 0.5) discard;
          
          // Soft edge
          float alpha = 1.0 - smoothstep(0.2, 0.5, dist);
          alpha *= vAlpha;
          
          // Add glow
          vec3 glow = vColor * (1.0 - dist * 1.5);
          
          gl_FragColor = vec4(glow, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }, []);

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={particles.positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={count}
          array={particles.colors}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={count}
          array={particles.sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <primitive object={shaderMaterial} attach="material" />
    </points>
  );
}
