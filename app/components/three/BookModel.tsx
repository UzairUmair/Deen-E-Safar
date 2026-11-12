"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { bookCoverTexture, bookSpineTexture, disposeGilded, pageEdgeTexture } from "./textures";

export type ShelfBook = { id: string; title: string; label: string; color: string };

const WIDTH = 0.98;
const BOARD = 0.03;

/** One hardback on the shelf. It eases forward while hovered, focused or selected. */
export function BookModel({
  book,
  index,
  height,
  thickness,
  position,
  raised,
  interactive,
  onHover,
  onSelect,
}: {
  book: ShelfBook;
  index: number;
  height: number;
  thickness: number;
  position: [number, number, number];
  raised: boolean;
  interactive: () => boolean;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const lift = useRef(0);
  const invalidate = useThree((s) => s.invalidate);
  const assets = useMemo(() => {
    const cover = bookCoverTexture(book.color, book.title, 31 + index * 7);
    const spine = bookSpineTexture(book.color, book.title, 57 + index * 5);
    const edgeMap = pageEdgeTexture();
    const gilt = (g: typeof cover) => new THREE.MeshStandardMaterial({ map: g.map, roughnessMap: g.orm, metalnessMap: g.orm, roughness: 1, metalness: 1, emissive: "#CBAA69", emissiveIntensity: 0 });
    const leather = new THREE.MeshStandardMaterial({ color: book.color, roughness: 0.7, emissive: "#CBAA69", emissiveIntensity: 0 });
    const coverMaterial = gilt(cover);
    const spineMaterial = gilt(spine);
    const pages = new THREE.MeshStandardMaterial({ map: edgeMap, roughness: 0.9 });
    return {
      textures: [cover, spine],
      edgeMap,
      glow: [leather, coverMaterial, spineMaterial],
      all: [leather, coverMaterial, spineMaterial, pages],
      // BoxGeometry face order: +x, -x, +y, -y, +z, -z
      front: [leather, leather, leather, leather, coverMaterial, leather],
      spine: [leather, spineMaterial, leather, leather, leather, leather],
      leather,
      pages,
    };
  }, [book.color, book.title, index]);
  useEffect(
    () => () => {
      assets.textures.forEach(disposeGilded);
      assets.edgeMap.dispose();
      assets.all.forEach((m) => m.dispose());
    },
    [assets],
  );
  useEffect(() => {
    invalidate();
  }, [raised, invalidate]);

  useFrame((_, delta) => {
    const target = raised ? 1 : 0;
    if (lift.current === target || !group.current) return;
    lift.current += (target - lift.current) * (1 - Math.exp(-Math.min(delta, 0.05) * 9));
    if (Math.abs(target - lift.current) < 0.002) lift.current = target;
    else invalidate();
    group.current.position.set(position[0], position[1] + lift.current * 0.03, position[2] + lift.current * 0.2);
    assets.glow.forEach((m) => (m.emissiveIntensity = lift.current * 0.09));
  });

  return (
    <group
      ref={group}
      position={position}
      onPointerOver={(e) => {
        if (!interactive()) return;
        e.stopPropagation();
        onHover(book.id);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        onHover(null);
        document.body.style.cursor = "";
      }}
      onClick={(e) => {
        if (!interactive()) return;
        e.stopPropagation();
        onSelect(book.id);
      }}
    >
      {/* Turned on the shelf so both the spine and the front board face the reader. */}
      <group rotation={[0, 1.1, 0]}>
        <mesh material={assets.pages} position={[0.012, 0, 0]}>
          <boxGeometry args={[WIDTH - 0.07, height - 0.07, thickness - BOARD * 2]} />
        </mesh>
        <mesh material={assets.front} position={[0, 0, thickness / 2 - BOARD / 2]}>
          <boxGeometry args={[WIDTH, height, BOARD]} />
        </mesh>
        <mesh material={assets.leather} position={[0, 0, -thickness / 2 + BOARD / 2]}>
          <boxGeometry args={[WIDTH, height, BOARD]} />
        </mesh>
        <mesh material={assets.spine} position={[-WIDTH / 2 + BOARD / 2, 0, 0]}>
          <boxGeometry args={[BOARD, height, thickness]} />
        </mesh>
      </group>
      {raised && (
        <Html center position={[0, height / 2 + 0.24, 0.2]} zIndexRange={[5, 0]} style={{ pointerEvents: "none" }}>
          <span className="book-label">{book.label}</span>
        </Html>
      )}
    </group>
  );
}
