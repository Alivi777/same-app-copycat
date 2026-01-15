import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export function LabFloor() {
  const meshRef = useRef<THREE.Mesh>(null);
  const gridRef = useRef<THREE.Mesh>(null);
  
  const circuitTexture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d")!;
    
    // Dark background
    ctx.fillStyle = "#0a0f1a";
    ctx.fillRect(0, 0, 512, 512);
    
    // Circuit pattern
    ctx.strokeStyle = "#22d3ee20";
    ctx.lineWidth = 1;
    
    // Grid lines
    for (let i = 0; i < 512; i += 32) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 512);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(512, i);
      ctx.stroke();
    }
    
    // Circuit traces
    ctx.strokeStyle = "#22d3ee30";
    ctx.lineWidth = 2;
    for (let i = 0; i < 20; i++) {
      ctx.beginPath();
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      ctx.moveTo(x, y);
      for (let j = 0; j < 5; j++) {
        const direction = Math.floor(Math.random() * 4);
        const length = 20 + Math.random() * 60;
        switch (direction) {
          case 0: ctx.lineTo(x + length, y); break;
          case 1: ctx.lineTo(x - length, y); break;
          case 2: ctx.lineTo(x, y + length); break;
          case 3: ctx.lineTo(x, y - length); break;
        }
      }
      ctx.stroke();
    }
    
    // Circuit nodes
    ctx.fillStyle = "#22d3ee40";
    for (let i = 0; i < 50; i++) {
      ctx.beginPath();
      ctx.arc(Math.random() * 512, Math.random() * 512, 2 + Math.random() * 4, 0, Math.PI * 2);
      ctx.fill();
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);
    return texture;
  }, []);

  // Animated grid shader
  const gridMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: true,
      uniforms: {
        uTime: { value: 0 },
        uColor1: { value: new THREE.Color("#22d3ee") },
        uColor2: { value: new THREE.Color("#d946ef") },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uColor1;
        uniform vec3 uColor2;
        varying vec2 vUv;
        
        void main() {
          vec2 uv = vUv * 20.0;
          
          // Grid lines
          float lineX = smoothstep(0.95, 1.0, fract(uv.x));
          float lineY = smoothstep(0.95, 1.0, fract(uv.y));
          float grid = max(lineX, lineY);
          
          // Animated pulse
          float pulse = sin(uTime * 2.0 + uv.x * 0.5) * 0.5 + 0.5;
          float pulse2 = sin(uTime * 1.5 + uv.y * 0.3) * 0.5 + 0.5;
          
          // Color gradient
          vec3 color = mix(uColor1, uColor2, pulse * pulse2);
          
          // Data streams
          float stream = sin(uv.y * 10.0 - uTime * 5.0) * 0.5 + 0.5;
          stream *= smoothstep(0.4, 0.5, fract(uv.x * 2.0));
          
          float alpha = grid * 0.3 + stream * 0.1;
          
          gl_FragColor = vec4(color, alpha);
        }
      `,
    });
  }, []);

  useFrame((state) => {
    if (gridMaterial.uniforms) {
      gridMaterial.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  return (
    <group>
      {/* Base floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[30, 20]} />
        <meshStandardMaterial 
          map={circuitTexture}
          metalness={0.8}
          roughness={0.2}
          color="#1a1f2e"
        />
      </mesh>
      
      {/* Animated grid overlay */}
      <mesh ref={gridRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <planeGeometry args={[30, 20]} />
        <primitive object={gridMaterial} attach="material" />
      </mesh>
      
      {/* Reflective floor effect */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <planeGeometry args={[30, 20]} />
        <meshStandardMaterial 
          color="#0a0f1a"
          metalness={1}
          roughness={0}
          envMapIntensity={0.5}
        />
      </mesh>
    </group>
  );
}
