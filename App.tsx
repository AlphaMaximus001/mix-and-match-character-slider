import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Scene } from './components/Scene';

const App: React.FC = () => {
  return (
    <div className="w-full h-screen bg-gray-50 flex flex-col items-center justify-center">
      <div className="absolute top-4 left-4 z-10 pointer-events-none">
        <h1 className="text-2xl font-bold text-gray-800">Mix & Match</h1>
        <p className="text-gray-600">R3F Orthographic Slider Foundation</p>
      </div>
      
      <div className="w-full h-full">
        {/* 
          The Canvas is the entry point for React Three Fiber.
          We enable localClippingEnabled to support the sliced model planes.
          We enable shadows for better 3D visualization.
        */}
        <Canvas shadows gl={{ localClippingEnabled: true }}>
          <Suspense fallback={null}>
            <Scene />
          </Suspense>
        </Canvas>
      </div>
    </div>
  );
};

export default App;