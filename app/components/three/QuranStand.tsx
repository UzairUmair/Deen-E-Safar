"use client";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { BOOK } from "./quranRig";
import { woodTexture } from "./textures";

const { thickness: T, board, alpha } = BOOK;
const PLANK = 0.085;
const WIDTH = 1.72; // along the spine
const WING = 1.36;
const LEG = -1.72;

// Centre line of the right-hand plank: it supports the back board from below.
const ORIGIN_X = T / 2 + (board + PLANK / 2) * Math.sin(alpha);
const ORIGIN_Y = -(board + PLANK / 2) * Math.cos(alpha);
const CROSSING = -ORIGIN_X / Math.cos(alpha);
/** Height of the surface the rehal stands on, in book space. */
export const STAND_FLOOR = ORIGIN_Y + LEG * Math.sin(alpha) - (PLANK / 2) * Math.cos(alpha) - 0.02;

/**
 * Folding rehal: two planks crossing in an X. Below the crossing one plank continues
 * as a central tongue and the other as two outer legs, so they interlock like a real one.
 */
export function QuranStand({ shadows }: { shadows: boolean }) {
  const { material, map } = useMemo(() => {
    const map = woodTexture();
    return { map, material: new THREE.MeshStandardMaterial({ map, roughness: 0.5, metalness: 0.04 }) };
  }, []);
  useEffect(
    () => () => {
      map.dispose();
      material.dispose();
    },
    [map, material],
  );
  const wingLength = WING - CROSSING + 0.06;
  const legLength = CROSSING - LEG + 0.06;
  const wing = (
    <mesh position={[(WING + CROSSING - 0.06) / 2, 0, 0]} material={material} castShadow={shadows} receiveShadow={shadows}>
      <boxGeometry args={[wingLength, PLANK, WIDTH]} />
    </mesh>
  );
  const leg = (z: number, depth: number) => (
    <mesh key={z} position={[(LEG + CROSSING + 0.06) / 2, 0, z]} material={material} castShadow={shadows}>
      <boxGeometry args={[legLength, PLANK, depth]} />
    </mesh>
  );
  return (
    <>
      <group position={[ORIGIN_X, ORIGIN_Y, 0]} rotation={[0, 0, alpha]}>
        {wing}
        {leg(0, WIDTH * 0.36)}
      </group>
      <group position={[-ORIGIN_X, ORIGIN_Y, 0]} rotation={[0, 0, Math.PI - alpha]}>
        {wing}
        {[-1, 1].map((side) => leg(side * WIDTH * 0.35, WIDTH * 0.3))}
      </group>
    </>
  );
}
