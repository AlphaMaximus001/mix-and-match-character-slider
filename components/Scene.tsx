import React, { useMemo, useRef } from 'react';
import { OrthographicCamera, Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useDrag } from '@use-gesture/react';
import { useSpring } from '@react-spring/three';
import * as THREE from 'three';

// Monkey-patching JSX namespace for R3F elements to satisfy TypeScript
// We extend both React.JSX (for React 18+) and global JSX (legacy/other configs)
declare global {
  namespace React {
    namespace JSX {
      interface IntrinsicElements {
        group: any;
        mesh: any;
        cylinderGeometry: any;
        sphereGeometry: any;
        boxGeometry: any;
        planeGeometry: any;
        meshStandardMaterial: any;
        shadowMaterial: any;
        ambientLight: any;
        directionalLight: any;
        color: any;
      }
    }
  }
  namespace JSX {
    interface IntrinsicElements {
      group: any;
      mesh: any;
      cylinderGeometry: any;
      sphereGeometry: any;
      boxGeometry: any;
      planeGeometry: any;
      meshStandardMaterial: any;
      shadowMaterial: any;
      ambientLight: any;
      directionalLight: any;
      color: any;
    }
  }
}

/**
 * Requirements:
 * - Camera: Orthographic, zoomed out slightly for better view of cylinders.
 * - 6 Characters arranged horizontally.
 * - Architecture: 3 separate parent groups (Heads, Torsos, Legs).
 * - Infinite Drag Logic.
 * - Visuals: Simple geometric cylinders (Toy-like aesthetic).
 */

const CHARACTER_COUNT = 6;
const SPACING = 3.0; // Slightly wider for cylinders
const TOTAL_WIDTH = CHARACTER_COUNT * SPACING;
const START_X = -((CHARACTER_COUNT - 1) * SPACING) / 2;

const COLORS = [
  "#ef4444", // Red
  "#f97316", // Orange
  "#f59e0b", // Amber
  "#22c55e", // Green
  "#3b82f6", // Blue
  "#a855f7", // Purple
];

type SegmentType = 'head' | 'torso' | 'legs';

// --- Segment Component (The Visuals) ---
interface SegmentProps {
  type: SegmentType;
  color: string;
}

const Segment: React.FC<SegmentProps> = ({ type, color }) => {
  // Common material
  const material = useMemo(() => new THREE.MeshStandardMaterial({ 
    color, 
    roughness: 0.3, 
    metalness: 0.1 
  }), [color]);

  const eyeMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: '#1f2937', roughness: 0.1 }), []);

  if (type === 'head') {
    return (
      <group>
        {/* Main Head Shape */}
        <mesh material={material} castShadow receiveShadow>
          <cylinderGeometry args={[0.6, 0.6, 0.9, 32]} />
        </mesh>
        {/* Eyes */}
        <mesh position={[-0.2, 0.1, 0.5]} material={eyeMaterial}>
          <sphereGeometry args={[0.08, 16, 16]} />
        </mesh>
        <mesh position={[0.2, 0.1, 0.5]} material={eyeMaterial}>
          <sphereGeometry args={[0.08, 16, 16]} />
        </mesh>
      </group>
    );
  }

  if (type === 'torso') {
    return (
      <group>
         {/* Main Body */}
        <mesh material={material} castShadow receiveShadow>
          <cylinderGeometry args={[0.6, 0.6, 0.9, 32]} />
        </mesh>
        {/* Simple detail (e.g. a belt or badge area) */}
        <mesh position={[0, 0, 0.55]} receiveShadow>
          <boxGeometry args={[0.4, 0.4, 0.1]} />
          <meshStandardMaterial color="white" opacity={0.5} transparent />
        </mesh>
      </group>
    );
  }

  if (type === 'legs') {
    return (
      <group>
        {/* Left Leg */}
        <mesh position={[-0.3, 0, 0]} material={material} castShadow receiveShadow>
          <cylinderGeometry args={[0.25, 0.25, 0.9, 32]} />
        </mesh>
        {/* Right Leg */}
        <mesh position={[0.3, 0, 0]} material={material} castShadow receiveShadow>
          <cylinderGeometry args={[0.25, 0.25, 0.9, 32]} />
        </mesh>
      </group>
    );
  }

  return null;
};

// --- Reusable Draggable Row Component ---
interface RowProps {
  y: number;
  type: SegmentType;
  name: string;
}

const DraggableRow: React.FC<RowProps> = ({ y, type, name }) => {
  const indices = useMemo(() => Array.from({ length: CHARACTER_COUNT }, (_, i) => i), []);
  const groupRefs = useRef<(THREE.Group | null)[]>([]);

  const [{ x }, api] = useSpring(() => ({
    x: 0,
    config: { mass: 1, tension: 200, friction: 20, precision: 0.001 },
  }));

  const bind = useDrag(
    ({ down, offset: [ox] }) => {
      // Use a smaller divisor for sensitivity since objects are smaller/closer
      const currentX = ox / 40;
      if (down) {
        api.start({ x: currentX, immediate: true });
      } else {
        const snapTarget = Math.round(currentX / SPACING) * SPACING;
        api.start({ x: snapTarget, immediate: false });
      }
    },
    { from: () => [x.get() * 40, 0] }
  );

  useFrame(() => {
    const currentDrag = x.get();
    const halfWidth = TOTAL_WIDTH / 2;
    
    // Calculate rotation based on drag distance
    // One full rotation (2 * PI) for every SPACING unit moved.
    // This ensures that when the item snaps to a slot, it is always facing forward.
    const rotationY = (currentDrag / SPACING) * Math.PI * 2;

    groupRefs.current.forEach((group, i) => {
      if (!group) return;
      const initialPos = START_X + i * SPACING;
      const currentPos = initialPos + currentDrag;
      // Infinite wrapping logic
      const wrappedPos = ((((currentPos + halfWidth) % TOTAL_WIDTH) + TOTAL_WIDTH) % TOTAL_WIDTH) - halfWidth;
      
      group.position.x = wrappedPos;
      
      // Apply rotation only to this specific row's elements
      group.rotation.y = rotationY;
    });
  });

  return (
    <group name={name} position={[0, y, 0]} {...bind() as any}>
      {/* Invisible plane to catch drag events easier */}
      <mesh position={[0, 0, 0.6]} visible={false}>
        <planeGeometry args={[20, 1.0]} />
      </mesh>

      {indices.map((i) => (
        <group 
          key={`${name}-${i}`} 
          ref={(el) => (groupRefs.current[i] = el)}
          position={[START_X + i * SPACING, 0, 0]}
        >
           <Segment 
            type={type}
            color={COLORS[i % COLORS.length]}
          />
        </group>
      ))}
    </group>
  );
};

export const Scene: React.FC = () => {
  // Vertical spacing calculation
  // Each segment height is roughly 0.9.
  // Gap of 0.1 between them.
  // Center (Torso) at 0.
  // Top (Head) at 1.0.
  // Bottom (Legs) at -1.0.

  return (
    <>
      <OrthographicCamera makeDefault position={[0, 0, 20]} zoom={60} near={0.1} far={1000} />
      
      <ambientLight intensity={0.7} />
      <directionalLight 
        position={[5, 10, 10]} 
        intensity={1.2} 
        castShadow 
        shadow-mapSize={[1024, 1024]} 
      />
      
      {/* Fill Light for softer shadows */}
      <directionalLight position={[-5, 5, 2]} intensity={0.3} />

      <color attach="background" args={['#f3f4f6']} />

      {/* Decorative Text */}
      <Text 
        position={[0, 0, -4]} 
        fontSize={3} 
        color="#e5e7eb" 
        anchorX="center" 
        anchorY="middle"
        font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff"
      >
        MIX & MATCH
      </Text>

      <DraggableRow 
        name="Heads"
        y={1.0}
        type="head"
      />

      <DraggableRow 
        name="Torsos"
        y={0}
        type="torso"
      />

      <DraggableRow 
        name="Legs"
        y={-1.0}
        type="legs"
      />
      
      {/* Floor Shadow Plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.5, 0]} receiveShadow>
        <planeGeometry args={[50, 50]} />
        <shadowMaterial opacity={0.1} color="#1f2937" />
      </mesh>
    </>
  );
};