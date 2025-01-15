import React, { useRef, useEffect } from "react";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

interface STLViewerProps {
  file: File;
}

const STLViewer: React.FC<STLViewerProps> = ({ file }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  const handleResize = () => {
    if (!mountRef.current || !rendererRef.current || !cameraRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    rendererRef.current.setSize(width, height);
    cameraRef.current.aspect = width / height;
    cameraRef.current.updateProjectionMatrix();
  };

  useEffect(() => {
    if (!file || !mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    cameraRef.current = camera;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    rendererRef.current = renderer;

    renderer.setSize(width, height);
    renderer.setClearColor(0xffffff, 1);
    mountRef.current?.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.enableZoom = true;
    controls.maxDistance = 300;
    controls.minDistance = 70;

    const loader = new STLLoader();
    loader.load(URL.createObjectURL(file), (geometry) => {
      const material = new THREE.MeshPhysicalMaterial({ color: 0xffffff });
      const mesh = new THREE.Mesh(geometry, material);

      // Center the model
      mesh.geometry.center();

      scene.add(mesh);
      mesh.rotation.x = -1.2;

      // Add lights
      const ambientLight = new THREE.AmbientLight(0x404040);
      scene.add(ambientLight);

      // Add directional light
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
      directionalLight.position.set(1, -1, 1);
      scene.add(directionalLight);

      // Position camera
      camera.position.z = 200;

      const animate = () => {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
      };
      animate();
    });

    // Add resize listener
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      rendererRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
      if (mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, [file]);

  // Add resize observer for container size changes
  useEffect(() => {
    if (!mountRef.current) return;

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(mountRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return <div ref={mountRef} className="w-11/12 lg:w-full h-[50vh] lg:h-full" />;
};

export default STLViewer;
