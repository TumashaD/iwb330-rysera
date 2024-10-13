import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

interface STLViewerProps {
  file: File;
}

const STLViewer: React.FC<STLViewerProps> = ({ file }) => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!file) return;

    const width = mountRef.current?.clientWidth || 0;
    const height = mountRef.current?.clientHeight || 0;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer();

    renderer.setSize(width, height);
    renderer.setClearColor(0xffffff, 1);
    mountRef.current?.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.enableZoom = true;
    controls.maxDistance = 300;
    controls.minDistance = 100;

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
      const boundingBox = new THREE.Box3().setFromObject(mesh);
      const size = boundingBox.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      camera.position.set(0, 0, maxDim * 1.5);

      function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
      }
      animate();
    });

    return () => {
      mountRef.current?.removeChild(renderer.domElement);
    };
  }, [file]);

  return <div ref={mountRef} style={{ width: '100%', height: '100%' }} />;
};

export default STLViewer;