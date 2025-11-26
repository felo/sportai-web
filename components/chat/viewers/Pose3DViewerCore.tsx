"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { PoseDetectionResult } from "@/hooks/usePoseDetection";
import { Flex, IconButton, Tooltip } from "@radix-ui/themes";
import { ResetIcon, PlusIcon, MinusIcon, ChevronLeftIcon, ChevronRightIcon, ViewHorizontalIcon } from "@radix-ui/react-icons";

interface Pose3DViewerProps {
  pose: PoseDetectionResult | null;
  width: number;
  height: number;
  showFace?: boolean;
}

// BlazePose 3D keypoint connections (33 keypoints)
// Based on MediaPipe BlazePose GHUM topology
const BLAZEPOSE_CONNECTIONS = [
  // Face outline
  [1, 2], [2, 3], [3, 7], // Left eye to left ear
  [0, 1], [0, 4], // Nose to eyes
  [4, 5], [5, 6], [6, 8], // Right eye to right ear
  [9, 10], // Mouth
  // Torso
  [11, 12], // Shoulders
  [11, 23], [12, 24], // Shoulders to hips
  [23, 24], // Hips
  // Left arm
  [11, 13], [13, 15], [15, 17], [15, 19], [15, 21], // Shoulder -> Elbow -> Wrist -> Fingers
  // Right arm
  [12, 14], [14, 16], [16, 18], [16, 20], [16, 22], // Shoulder -> Elbow -> Wrist -> Fingers
  // Left leg
  [23, 25], [25, 27], [27, 29], [27, 31], // Hip -> Knee -> Ankle -> Foot
  // Right leg
  [24, 26], [26, 28], [28, 30], [28, 32], // Hip -> Knee -> Ankle -> Foot
];

export function Pose3DViewer({ pose, width, height, showFace = true }: Pose3DViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Refs for Three.js objects to persist across renders
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const skeletonRef = useRef<THREE.Group | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const frameIdRef = useRef<number | null>(null);
  
  // Camera state for buttons
  // Start unmirrored (false) as requested
  const [isMirrored, setIsMirrored] = useState(false);

  // Initialize Scene, Camera, Renderer, Controls
  useEffect(() => {
    if (!containerRef.current) return;

    // Cleanup previous instance if exists
    if (rendererRef.current) {
      rendererRef.current.dispose();
      if (rendererRef.current.domElement.parentElement) {
        rendererRef.current.domElement.parentElement.removeChild(rendererRef.current.domElement);
      }
    }

    // Initialize Three.js scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(0, 0, 5);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    // Skeleton group
    const skeletonGroup = new THREE.Group();
    scene.add(skeletonGroup);
    skeletonRef.current = skeletonGroup;

    // Grid helper
    const gridHelper = new THREE.GridHelper(10, 10, 0x444444, 0x222222);
    scene.add(gridHelper);

    // Add OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = true;
    controls.enableRotate = true;
    controlsRef.current = controls;

    // Animation loop
    const animate = () => {
      frameIdRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Cleanup function
    return () => {
      if (frameIdRef.current) {
        cancelAnimationFrame(frameIdRef.current);
      }
      if (controlsRef.current) {
        controlsRef.current.dispose();
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
        if (containerRef.current && rendererRef.current.domElement) {
          containerRef.current.removeChild(rendererRef.current.domElement);
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount - dimensions handled separately

  // Handle manual controls
  const handleZoom = (factor: number) => {
    if (cameraRef.current && controlsRef.current) {
      const camera = cameraRef.current;
      // Move camera closer or further along its look direction
      const direction = new THREE.Vector3();
      camera.getWorldDirection(direction);
      camera.position.addScaledVector(direction, factor);
      controlsRef.current.update();
    }
  };

  const handleRotate = (angle: number) => {
    if (cameraRef.current && controlsRef.current) {
      const camera = cameraRef.current;
      const x = camera.position.x;
      const z = camera.position.z;
      
      // Rotate around Y axis
      camera.position.x = x * Math.cos(angle) - z * Math.sin(angle);
      camera.position.z = x * Math.sin(angle) + z * Math.cos(angle);
      
      camera.lookAt(0, 0, 0);
      controlsRef.current.update();
    }
  };

  const handleReset = () => {
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.set(0, 0, 5);
      cameraRef.current.lookAt(0, 0, 0);
      controlsRef.current.reset();
    }
  };

  const handleToggleMirror = () => {
    setIsMirrored(prev => !prev);
  };

  // Update size on prop change
  useEffect(() => {
    if (!rendererRef.current || !cameraRef.current) return;
    
    cameraRef.current.aspect = width / height;
    cameraRef.current.updateProjectionMatrix();
    rendererRef.current.setSize(width, height);
  }, [width, height]);

  // Update skeleton when pose changes
  useEffect(() => {
    if (!sceneRef.current || !skeletonRef.current) return;
    
    // Check if we have 3D keypoints
    if (!pose || !pose.keypoints3D || pose.keypoints3D.length === 0) {
      // Clear skeleton if no 3D data
      while (skeletonRef.current.children.length > 0) {
        const child = skeletonRef.current.children[0];
        skeletonRef.current.remove(child);
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material.dispose();
          }
        }
        if (child instanceof THREE.Line) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
      return;
    }

    // Clear existing skeleton
    while (skeletonRef.current.children.length > 0) {
      const child = skeletonRef.current.children[0];
      skeletonRef.current.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
      if (child instanceof THREE.Line) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    }

    const keypoints3D = pose.keypoints3D;
    if (keypoints3D.length === 0) return;

    // Normalize keypoints to fit in view
    const positions = keypoints3D.map(kp => ({
      x: ((kp.x || 0) * (isMirrored ? -1 : 1)) * 2, // Scale to fit and handle mirroring
      y: -(kp.y || 0) * 2, // Flip Y axis
      z: (kp.z || 0) * 2,
    }));

    // Create keypoint spheres
    const sphereGeometry = new THREE.SphereGeometry(0.05, 16, 16);
    const sphereMaterial = new THREE.MeshPhongMaterial({ color: 0xff9800 });
    
    keypoints3D.forEach((kp, index) => {
      // Skip face keypoints if hidden (indices 0-10)
      if (!showFace && index <= 10) return;

      if (kp.score && kp.score > 0.3) {
        const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial.clone());
        sphere.position.set(positions[index].x, positions[index].y, positions[index].z);
        skeletonRef.current!.add(sphere);
      }
    });

    // Create connections (bones)
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x7adb8f, linewidth: 2 });
    
    BLAZEPOSE_CONNECTIONS.forEach(([startIdx, endIdx]) => {
      // Skip connections involving face if hidden
      if (!showFace && (startIdx <= 10 || endIdx <= 10)) return;

      if (startIdx < keypoints3D.length && endIdx < keypoints3D.length) {
        const startKp = keypoints3D[startIdx];
        const endKp = keypoints3D[endIdx];
        
        if (startKp.score && startKp.score > 0.3 && endKp.score && endKp.score > 0.3) {
          const startPos = positions[startIdx];
          const endPos = positions[endIdx];
          
          const geometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(startPos.x, startPos.y, startPos.z),
            new THREE.Vector3(endPos.x, endPos.y, endPos.z),
          ]);
          
          const line = new THREE.Line(geometry, lineMaterial);
          skeletonRef.current!.add(line);
        }
      }
    });

    // Auto-rotate camera for better view
    if (cameraRef.current) {
      const center = new THREE.Vector3();
      positions.forEach(p => center.add(new THREE.Vector3(p.x, p.y, p.z)));
      center.divideScalar(positions.length);
      
      cameraRef.current.lookAt(center);
    }
    
    // Force a render after updating skeleton
    if (rendererRef.current && sceneRef.current && cameraRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }
  }, [pose, isMirrored, showFace]); // React will detect changes in pose object

  return (
    <div style={{ position: "relative", width: `${width}px`, height: `${height}px` }}>
      {/* Controls Overlay */}
      <Flex 
        style={{ 
          position: "absolute", 
          top: 10, 
          right: 10, 
          zIndex: 10,
          background: "rgba(0, 0, 0, 0.5)",
          padding: "4px",
          borderRadius: "8px",
          backdropFilter: "blur(4px)"
        }} 
        gap="2"
      >
        <Tooltip content="Rotate Left">
          <IconButton size="1" variant="ghost" onClick={() => handleRotate(0.2)} color="gray" highContrast>
            <ChevronLeftIcon width="18" height="18" />
          </IconButton>
        </Tooltip>
        <Tooltip content="Rotate Right">
          <IconButton size="1" variant="ghost" onClick={() => handleRotate(-0.2)} color="gray" highContrast>
            <ChevronRightIcon width="18" height="18" />
          </IconButton>
        </Tooltip>
        <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.2)", margin: "0 2px" }} />
        <Tooltip content="Zoom In">
          <IconButton size="1" variant="ghost" onClick={() => handleZoom(0.5)} color="gray" highContrast>
            <PlusIcon width="18" height="18" />
          </IconButton>
        </Tooltip>
        <Tooltip content="Zoom Out">
          <IconButton size="1" variant="ghost" onClick={() => handleZoom(-0.5)} color="gray" highContrast>
            <MinusIcon width="18" height="18" />
          </IconButton>
        </Tooltip>
        <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.2)", margin: "0 2px" }} />
        <Tooltip content={isMirrored ? "Unmirror View" : "Mirror View"}>
          <IconButton size="1" variant="ghost" onClick={handleToggleMirror} color={isMirrored ? "blue" : "gray"} highContrast>
            <ViewHorizontalIcon width="18" height="18" />
          </IconButton>
        </Tooltip>
        <Tooltip content="Reset View">
          <IconButton size="1" variant="ghost" onClick={handleReset} color="gray" highContrast>
            <ResetIcon width="18" height="18" />
          </IconButton>
        </Tooltip>
      </Flex>

      <div
        ref={containerRef}
        style={{
          width: "100%",
          height: "100%",
          backgroundColor: "#1a1a1a",
          borderRadius: "var(--radius-3)",
          overflow: "hidden",
          position: "relative",
          userSelect: "none",
          touchAction: "none",
        }}
        onContextMenu={(e) => e.preventDefault()}
      />
    </div>
  );
}

