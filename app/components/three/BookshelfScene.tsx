"use client";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { BookModel, type ShelfBook } from "./BookModel";
import { blobShadowTexture } from "./textures";

const W = 3.9; // interior width
const H = 1.72; // interior height
const D = 1.12;
const BOARD = 0.15;
const HEIGHTS = [1.38, 1.47, 1.34, 1.42];
const THICKNESS = [0.26, 0.22, 0.28, 0.24];

/** Lacquered display shelf with gilt trim holding the four study books. */
export function BookshelfScene({
  books,
  raisedId,
  interactive,
  onHover,
  onSelect,
}: {
  books: ShelfBook[];
  raisedId: string | null;
  interactive: () => boolean;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
}) {
  const assets = useMemo(
    () => ({
      lacquer: new THREE.MeshStandardMaterial({ color: "#EFE6D2", roughness: 0.46 }),
      inner: new THREE.MeshStandardMaterial({ color: "#D9CBB0", roughness: 0.8 }),
      gold: new THREE.MeshStandardMaterial({ color: "#C9A45C", roughness: 0.32, metalness: 1 }),
      stud: new THREE.MeshStandardMaterial({ color: "#7FD0C8", roughness: 0.25, metalness: 0.1 }),
      shadow: blobShadowTexture(),
    }),
    [],
  );
  useEffect(
    () => () => {
      assets.lacquer.dispose();
      assets.inner.dispose();
      assets.gold.dispose();
      assets.stud.dispose();
      assets.shadow.dispose();
    },
    [assets],
  );
  const frontZ = (D + 0.1) / 2 + 0.012;
  const boardY = H / 2 + BOARD / 2;
  return (
    <group rotation={[0.07, -0.62, 0]}>
      {[1, -1].map((side) => (
        <group key={side}>
          <mesh position={[0, side * boardY, 0]} material={assets.lacquer}>
            <boxGeometry args={[W + 0.5, BOARD, D + 0.1]} />
          </mesh>
          <mesh position={[0, side * (boardY + BOARD / 2 + 0.035), 0]} material={assets.lacquer}>
            <boxGeometry args={[W + 0.32, 0.07, D - 0.04]} />
          </mesh>
          <mesh position={[side * (W / 2 + 0.07), 0, 0]} material={assets.lacquer}>
            <boxGeometry args={[0.14, H, D]} />
          </mesh>
          {[0.048, -0.048].map((offset) => (
            <mesh key={offset} position={[0, side * boardY + offset, frontZ]} material={assets.gold}>
              <boxGeometry args={[W + 0.52, 0.022, 0.03]} />
            </mesh>
          ))}
          <mesh position={[0, side * boardY, frontZ]} material={assets.stud}>
            <sphereGeometry args={[0.04, 16, 12]} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0, -D / 2 + 0.025]} material={assets.inner}>
        <boxGeometry args={[W + 0.28, H, 0.05]} />
      </mesh>
      {/* Gilt roundel on the side panel that faces the reader. */}
      <group position={[W / 2 + 0.143, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <mesh material={assets.gold}>
          <torusGeometry args={[0.3, 0.012, 8, 40]} />
        </mesh>
        <mesh material={assets.gold}>
          <torusGeometry args={[0.2, 0.008, 8, 40]} />
        </mesh>
        <mesh material={assets.stud}>
          <sphereGeometry args={[0.045, 16, 12]} />
        </mesh>
      </group>
      {books.map((book, i) => (
        <BookModel
          key={book.id}
          book={book}
          index={i}
          height={HEIGHTS[i % 4]}
          thickness={THICKNESS[i % 4]}
          position={[-1.3 + i * 0.87, -H / 2 + HEIGHTS[i % 4] / 2, 0.03]}
          raised={raisedId === book.id}
          interactive={interactive}
          onHover={onHover}
          onSelect={onSelect}
        />
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -H / 2 - 0.85, 0.1]}>
        <planeGeometry args={[5.4, 2]} />
        <meshBasicMaterial map={assets.shadow} transparent depthWrite={false} opacity={0.42} />
      </mesh>
    </group>
  );
}
