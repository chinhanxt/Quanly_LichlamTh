'use client';
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface PetSceneCanvasProps {
  focusField: 'username' | 'password' | null;
  isIdle: boolean;
}

export const PetSceneCanvas: React.FC<PetSceneCanvasProps> = ({ focusField, isIdle }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth || 260;
    const height = container.clientHeight || 150;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0.2, 7.5);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // 2. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.3);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.4);
    dirLight.position.set(3, 5, 5);
    scene.add(dirLight);

    const pointLight = new THREE.PointLight(0xc084fc, 0.9, 10);
    pointLight.position.set(-2, 2, 3);
    scene.add(pointLight);

    // 3. Materials
    const dogFurMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 });
    const catFurMat = new THREE.MeshStandardMaterial({ color: 0xe9d5ff, roughness: 0.5 });
    const catEarInnerMat = new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.4 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2 });
    const pinkNoseMat = new THREE.MeshStandardMaterial({ color: 0xec4899, roughness: 0.3 });
    const pawPadMat = new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.4 });

    // Helper: Create Paw Pad Spheres
    const addPawPads = (parentMesh: THREE.Object3D, padColorMat: THREE.Material) => {
      const padGeo = new THREE.SphereGeometry(0.05, 8, 8);
      const padCenter = new THREE.Mesh(padGeo, padColorMat);
      padCenter.position.set(0, 0, 0.18);
      parentMesh.add(padCenter);

      for (let i = 0; i < 3; i++) {
        const toe = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), padColorMat);
        const angle = (i - 1) * 0.4;
        toe.position.set(Math.sin(angle) * 0.08, 0.08, 0.17);
        parentMesh.add(toe);
      }
    };


    // ==========================================
    // 🐶 1. FLUFFY SAMOYED DOG (Full-Body Model)
    // ==========================================
    const dogRoot = new THREE.Group();
    dogRoot.position.set(-1.25, -1.0, 0);
    scene.add(dogRoot);

    // Torso / Body
    const dogTorsoGeo = new THREE.CylinderGeometry(0.5, 0.65, 1.2, 16);
    const dogTorso = new THREE.Mesh(dogTorsoGeo, dogFurMat);
    dogTorso.position.set(0, 0.6, 0);
    dogRoot.add(dogTorso);

    // Dog Back Legs / Feet (Seated)
    const legGeo = new THREE.SphereGeometry(0.25, 16, 16);
    legGeo.scale(1, 0.7, 1.3);
    const dogFootL = new THREE.Mesh(legGeo, dogFurMat);
    dogFootL.position.set(-0.45, 0.18, 0.25);
    dogRoot.add(dogFootL);

    const dogFootR = new THREE.Mesh(legGeo, dogFurMat);
    dogFootR.position.set(0.45, 0.18, 0.25);
    dogRoot.add(dogFootR);

    // Dog Fluffy Wagging Tail
    const dogTailGroup = new THREE.Group();
    dogTailGroup.position.set(0, 0.4, -0.4);
    dogRoot.add(dogTailGroup);

    const tailGeo = new THREE.CylinderGeometry(0.08, 0.22, 0.8, 16);
    const dogTail = new THREE.Mesh(tailGeo, dogFurMat);
    dogTail.position.set(0, 0.35, -0.2);
    dogTail.rotation.x = -0.6;
    dogTailGroup.add(dogTail);

    // Dog Head Assembly
    const dogHeadGroup = new THREE.Group();
    dogHeadGroup.position.set(0, 1.35, 0);
    dogRoot.add(dogHeadGroup);

    const dogHeadMesh = new THREE.Mesh(new THREE.SphereGeometry(0.72, 32, 32), dogFurMat);
    dogHeadGroup.add(dogHeadMesh);

    // Snout & Nose
    const dogSnout = new THREE.Mesh(new THREE.SphereGeometry(0.38, 16, 16), dogFurMat);
    dogSnout.position.set(0, -0.15, 0.5);
    dogSnout.scale.set(1, 0.85, 1.1);
    dogHeadGroup.add(dogSnout);

    const dogNose = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 16), darkMat);
    dogNose.position.set(0, -0.05, 0.85);
    dogHeadGroup.add(dogNose);

    // Ears
    const earConeGeo = new THREE.ConeGeometry(0.28, 0.6, 16);
    const dogEarL = new THREE.Mesh(earConeGeo, dogFurMat);
    dogEarL.position.set(-0.5, 0.65, 0);
    dogEarL.rotation.z = 0.25;
    dogHeadGroup.add(dogEarL);

    const dogEarR = new THREE.Mesh(earConeGeo, dogFurMat);
    dogEarR.position.set(0.5, 0.65, 0);
    dogEarR.rotation.z = -0.25;
    dogHeadGroup.add(dogEarR);

    // Eyes
    const eyeSphereGeo = new THREE.SphereGeometry(0.1, 16, 16);
    const dogEyeL = new THREE.Mesh(eyeSphereGeo, darkMat);
    dogEyeL.position.set(-0.28, 0.12, 0.62);
    dogHeadGroup.add(dogEyeL);

    const dogEyeR = new THREE.Mesh(eyeSphereGeo, darkMat);
    dogEyeR.position.set(0.28, 0.12, 0.62);
    dogHeadGroup.add(dogEyeR);

    // --- Dog Front Arms (Shoulder Pivot Groups) ---
    const dogArmPivotL = new THREE.Group();
    dogArmPivotL.position.set(-0.55, 1.05, 0.1);
    dogRoot.add(dogArmPivotL);

    const dogArmPivotR = new THREE.Group();
    dogArmPivotR.position.set(0.55, 1.05, 0.1);
    dogRoot.add(dogArmPivotR);

    const armGeo = new THREE.CylinderGeometry(0.14, 0.16, 0.65, 16);
    const dogPawMeshGeo = new THREE.SphereGeometry(0.2, 16, 16);

    // Left Arm & Paw
    const dogArmL = new THREE.Mesh(armGeo, dogFurMat);
    dogArmL.position.set(0, -0.3, 0);
    dogArmPivotL.add(dogArmL);

    const dogPawL = new THREE.Mesh(dogPawMeshGeo, dogFurMat);
    dogPawL.position.set(0, -0.62, 0);
    addPawPads(dogPawL, pawPadMat);
    dogArmPivotL.add(dogPawL);

    // Right Arm & Paw
    const dogArmR = new THREE.Mesh(armGeo, dogFurMat);
    dogArmR.position.set(0, -0.3, 0);
    dogArmPivotR.add(dogArmR);

    const dogPawR = new THREE.Mesh(dogPawMeshGeo, dogFurMat);
    dogPawR.position.set(0, -0.62, 0);
    addPawPads(dogPawR, pawPadMat);
    dogArmPivotR.add(dogPawR);


    // ==========================================
    // 🐱 2. CUTE LAVENDER CAT (Full-Body Model)
    // ==========================================
    const catRoot = new THREE.Group();
    catRoot.position.set(1.25, -1.0, 0);
    scene.add(catRoot);

    // Cat Torso / Body
    const catTorsoGeo = new THREE.CylinderGeometry(0.42, 0.58, 1.1, 16);
    const catTorso = new THREE.Mesh(catTorsoGeo, catFurMat);
    catTorso.position.set(0, 0.55, 0);
    catRoot.add(catTorso);

    // Cat Feet
    const catFootL = new THREE.Mesh(legGeo, catFurMat);
    catFootL.position.set(-0.4, 0.16, 0.22);
    catRoot.add(catFootL);

    const catFootR = new THREE.Mesh(legGeo, catFurMat);
    catFootR.position.set(0.4, 0.16, 0.22);
    catRoot.add(catFootR);

    // Cat Waving Tail
    const catTailGroup = new THREE.Group();
    catTailGroup.position.set(0, 0.35, -0.35);
    catRoot.add(catTailGroup);

    const catTailGeo = new THREE.CylinderGeometry(0.06, 0.12, 0.9, 16);
    const catTail = new THREE.Mesh(catTailGeo, catFurMat);
    catTail.position.set(0, 0.4, -0.2);
    catTail.rotation.x = -0.5;
    catTailGroup.add(catTail);

    // Cat Head Assembly
    const catHeadGroup = new THREE.Group();
    catHeadGroup.position.set(0, 1.25, 0);
    catRoot.add(catHeadGroup);

    const catHeadMesh = new THREE.Mesh(new THREE.SphereGeometry(0.65, 32, 32), catFurMat);
    catHeadGroup.add(catHeadMesh);

    // Pointy Cat Ears
    const catEarConeGeo = new THREE.ConeGeometry(0.26, 0.65, 16);
    const catEarL = new THREE.Mesh(catEarConeGeo, catFurMat);
    catEarL.position.set(-0.42, 0.6, 0);
    catEarL.rotation.z = 0.22;
    catHeadGroup.add(catEarL);

    const catEarInnerL = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.45, 16), catEarInnerMat);
    catEarInnerL.position.set(-0.42, 0.6, 0.05);
    catEarInnerL.rotation.z = 0.22;
    catHeadGroup.add(catEarInnerL);

    const catEarR = new THREE.Mesh(catEarConeGeo, catFurMat);
    catEarR.position.set(0.42, 0.6, 0);
    catEarR.rotation.z = -0.22;
    catHeadGroup.add(catEarR);

    const catEarInnerR = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.45, 16), catEarInnerMat);
    catEarInnerR.position.set(0.42, 0.6, 0.05);
    catEarInnerR.rotation.z = -0.22;
    catHeadGroup.add(catEarInnerR);

    // Cat Nose
    const catNose = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.1, 16), pinkNoseMat);
    catNose.rotation.x = Math.PI;
    catNose.position.set(0, -0.08, 0.62);
    catHeadGroup.add(catNose);

    // Cat Eyes
    const catEyeL = new THREE.Mesh(eyeSphereGeo, darkMat);
    catEyeL.position.set(-0.25, 0.1, 0.58);
    catHeadGroup.add(catEyeL);

    const catEyeR = new THREE.Mesh(eyeSphereGeo, darkMat);
    catEyeR.position.set(0.25, 0.1, 0.58);
    catHeadGroup.add(catEyeR);

    // --- Cat Front Arms (Shoulder Pivot Groups) ---
    const catArmPivotL = new THREE.Group();
    catArmPivotL.position.set(-0.45, 0.95, 0.1);
    catRoot.add(catArmPivotL);

    const catArmPivotR = new THREE.Group();
    catArmPivotR.position.set(0.45, 0.95, 0.1);
    catRoot.add(catArmPivotR);

    const catArmL = new THREE.Mesh(armGeo, catFurMat);
    catArmL.position.set(0, -0.3, 0);
    catArmPivotL.add(catArmL);

    const catPawL = new THREE.Mesh(dogPawMeshGeo, catFurMat);
    catPawL.position.set(0, -0.62, 0);
    addPawPads(catPawL, pawPadMat);
    catArmPivotL.add(catPawL);

    const catArmR = new THREE.Mesh(armGeo, catFurMat);
    catArmR.position.set(0, -0.3, 0);
    catArmPivotR.add(catArmR);

    const catPawR = new THREE.Mesh(dogPawMeshGeo, catFurMat);
    catPawR.position.set(0, -0.62, 0);
    addPawPads(catPawR, pawPadMat);
    catArmPivotR.add(catPawR);


    // ==========================================
    // 🎬 ANIMATION LOOP (LERP Kinematics)
    // ==========================================
    let animationFrameId: number;
    let clock = new THREE.Clock();

    // Target rotations for shoulder pivots & head
    let targetArmRotX = 0;
    let targetArmRotZLeft = 0;
    let targetArmRotZRight = 0;
    let targetHeadRotX = 0;
    let targetHeadRotY = 0;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Determine targets based on focusField & idle
      if (focusField === 'password') {
        // Raise arms UP to cover eyes! 🙈
        targetArmRotX = -Math.PI * 0.72; // Arm points up & back towards head
        targetArmRotZLeft = 0.55;        // Left paw covers left eye
        targetArmRotZRight = -0.55;      // Right paw covers right eye
        targetHeadRotX = -0.15;
        targetHeadRotY = 0;
      } else if (focusField === 'username') {
        // Arms down, head tilts down to look at select box
        targetArmRotX = 0.2;
        targetArmRotZLeft = 0;
        targetArmRotZRight = 0;
        targetHeadRotX = 0.38;
        targetHeadRotY = 0;
      } else if (isIdle) {
        // Idle animation: wag tails & gentle head glance
        targetArmRotX = 0;
        targetArmRotZLeft = 0;
        targetArmRotZRight = 0;
        targetHeadRotX = Math.sin(elapsedTime * 2.5) * 0.08;
        targetHeadRotY = Math.cos(elapsedTime * 1.8) * 0.18;
      } else {
        targetArmRotX = 0;
        targetArmRotZLeft = 0;
        targetArmRotZRight = 0;
        targetHeadRotX = 0;
        targetHeadRotY = 0;
      }

      // Smooth LERP Shoulder Pivot Rotations
      dogArmPivotL.rotation.x = THREE.MathUtils.lerp(dogArmPivotL.rotation.x, targetArmRotX, 0.15);
      dogArmPivotL.rotation.z = THREE.MathUtils.lerp(dogArmPivotL.rotation.z, targetArmRotZLeft, 0.15);

      dogArmPivotR.rotation.x = THREE.MathUtils.lerp(dogArmPivotR.rotation.x, targetArmRotX, 0.15);
      dogArmPivotR.rotation.z = THREE.MathUtils.lerp(dogArmPivotR.rotation.z, targetArmRotZRight, 0.15);

      catArmPivotL.rotation.x = THREE.MathUtils.lerp(catArmPivotL.rotation.x, targetArmRotX, 0.15);
      catArmPivotL.rotation.z = THREE.MathUtils.lerp(catArmPivotL.rotation.z, targetArmRotZLeft, 0.15);

      catArmPivotR.rotation.x = THREE.MathUtils.lerp(catArmPivotR.rotation.x, targetArmRotX, 0.15);
      catArmPivotR.rotation.z = THREE.MathUtils.lerp(catArmPivotR.rotation.z, targetArmRotZRight, 0.15);

      // Smooth LERP Head Rotations
      dogHeadGroup.rotation.x = THREE.MathUtils.lerp(dogHeadGroup.rotation.x, targetHeadRotX, 0.12);
      dogHeadGroup.rotation.y = THREE.MathUtils.lerp(dogHeadGroup.rotation.y, targetHeadRotY, 0.12);

      catHeadGroup.rotation.x = THREE.MathUtils.lerp(catHeadGroup.rotation.x, targetHeadRotX, 0.12);
      catHeadGroup.rotation.y = THREE.MathUtils.lerp(catHeadGroup.rotation.y, targetHeadRotY, 0.12);

      // Tail Wagging
      dogTailGroup.rotation.y = Math.sin(elapsedTime * 6) * 0.35;
      catTailGroup.rotation.y = Math.cos(elapsedTime * 4) * 0.45;

      // Gentle body breathing
      dogRoot.position.y = -1.0 + Math.sin(elapsedTime * 3) * 0.02;
      catRoot.position.y = -1.0 + Math.cos(elapsedTime * 3) * 0.02;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [focusField, isIdle]);

  return <div ref={containerRef} className="w-full h-40 flex items-center justify-center pointer-events-none" />;
};
