"use client";
import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import * as THREE from "three";

/**
 * Warm key light that travels with the camera's subject, a cool fill, and a small
 * procedural environment (rendered once) so gilding and lacquer have something to reflect.
 */
export function SceneLighting({ focus, shadows }: { focus: THREE.Vector3; shadows: boolean }) {
  const key = useRef<THREE.DirectionalLight>(null);
  useEffect(() => {
    const light = key.current;
    if (!light) return;
    const camera = light.shadow.camera;
    camera.left = camera.bottom = -3.4;
    camera.right = camera.top = 3.4;
    camera.near = 2;
    camera.far = 22;
    camera.updateProjectionMatrix();
  }, []);
  useFrame(() => {
    const light = key.current;
    if (!light) return;
    light.position.set(focus.x - 3.2, focus.y + 7.5, focus.z + 5.5);
    light.target.position.copy(focus);
    light.target.updateMatrixWorld();
  });
  return (
    <>
      <ambientLight intensity={0.3} color="#fff3df" />
      <directionalLight ref={key} intensity={2.3} color="#ffe6c2" castShadow={shadows} shadow-mapSize={[1024, 1024]} shadow-bias={-0.0006} shadow-normalBias={0.02} />
      <directionalLight position={[6, 2, 3]} intensity={0.45} color="#cfe0ff" />
      <Environment resolution={128} frames={1}>
        <color attach="background" args={["#9a8f7c"]} />
        <Lightformer form="rect" intensity={3.2} color="#fff1d6" position={[0, 7, 3]} rotation-x={-Math.PI / 2.4} scale={[14, 9, 1]} />
        <Lightformer form="rect" intensity={1.5} color="#ffe2b8" position={[-8, 1, 3]} rotation-y={Math.PI / 2.4} scale={[7, 7, 1]} />
        <Lightformer form="rect" intensity={0.9} color="#dfe9ff" position={[8, 2, 2]} rotation-y={-Math.PI / 2.4} scale={[7, 7, 1]} />
        <Lightformer form="rect" intensity={1.1} color="#fffaf0" position={[0, 1, 10]} rotation-y={Math.PI} scale={[12, 6, 1]} />
      </Environment>
    </>
  );
}
