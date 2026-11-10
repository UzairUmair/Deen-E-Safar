"use client";
import { useEffect, useMemo, type RefObject } from "react";
import * as THREE from "three";
import { BOOK } from "./quranRig";
import { disposeGilded, quranCoverTexture, quranSpineTexture } from "./textures";

const { pageWidth, pageHeight, thickness: T, board, overhang, alpha } = BOOK;
const WIDTH = pageWidth + overhang;
const DEPTH = pageHeight + overhang * 2;

/**
 * Hardback case: back board (fixed on the rehal), spine strip hinged to it, and the
 * front board hinged to the far edge of the spine. Rotations are set by QuranBook.
 */
export function QuranCover({ spineRef, frontRef, shadows }: { spineRef: RefObject<THREE.Group | null>; frontRef: RefObject<THREE.Group | null>; shadows: boolean }) {
  const assets = useMemo(() => {
    const cover = quranCoverTexture();
    const spine = quranSpineTexture();
    const leather = new THREE.MeshStandardMaterial({ color: "#173F33", roughness: 0.74 });
    const endpaper = new THREE.MeshStandardMaterial({ color: "#EADFC4", roughness: 0.9 });
    const gilt = (g: typeof cover) => new THREE.MeshStandardMaterial({ map: g.map, roughnessMap: g.orm, metalnessMap: g.orm, roughness: 1, metalness: 1 });
    const coverMaterial = gilt(cover);
    const spineMaterial = gilt(spine);
    // BoxGeometry face order: +x, -x, +y, -y, +z, -z
    return {
      cover,
      spine,
      materials: [leather, endpaper, coverMaterial, spineMaterial],
      back: [leather, leather, endpaper, coverMaterial, leather, leather],
      front: [leather, leather, coverMaterial, endpaper, leather, leather],
      spineFaces: [leather, leather, spineMaterial, endpaper, leather, leather],
      leather,
    };
  }, []);
  useEffect(
    () => () => {
      disposeGilded(assets.cover);
      disposeGilded(assets.spine);
      assets.materials.forEach((m) => m.dispose());
    },
    [assets],
  );
  return (
    <>
      <group position={[T / 2, 0, 0]} rotation={[0, 0, alpha]}>
        <mesh position={[WIDTH / 2, -board / 2, 0]} material={assets.back} castShadow={shadows} receiveShadow={shadows}>
          <boxGeometry args={[WIDTH, board, DEPTH]} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} material={assets.leather}>
          <cylinderGeometry args={[board, board, DEPTH, 12]} />
        </mesh>
      </group>
      <group ref={spineRef} position={[T / 2, 0, 0]}>
        <mesh position={[T / 2, board / 2, 0]} material={assets.spineFaces} castShadow={shadows}>
          <boxGeometry args={[T, board, DEPTH]} />
        </mesh>
      </group>
      <group ref={frontRef}>
        <mesh position={[WIDTH / 2, board / 2, 0]} material={assets.front} castShadow={shadows} receiveShadow={shadows}>
          <boxGeometry args={[WIDTH, board, DEPTH]} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} material={assets.leather}>
          <cylinderGeometry args={[board, board, DEPTH, 12]} />
        </mesh>
      </group>
    </>
  );
}
