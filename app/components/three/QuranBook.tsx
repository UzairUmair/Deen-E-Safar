"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { QuranCover } from "./QuranCover";
import { createQuranPages } from "./QuranPages";
import { QuranStand, STAND_FLOOR } from "./QuranStand";
import { computeRig } from "./quranRig";
import { blobShadowTexture } from "./textures";
import type { Story } from "./story";

/** The Quran on its rehal. `story.open` (0 closed, 1 open) is the only animation input. */
export function QuranBook({ story, lowPower }: { story: Story; lowPower: boolean }) {
  const spine = useRef<THREE.Group>(null);
  const front = useRef<THREE.Group>(null);
  const applied = useRef(-1);
  const pages = useMemo(() => createQuranPages(lowPower ? 4 : 6, lowPower ? 16 : 24, !lowPower), [lowPower]);
  const shadow = useMemo(() => blobShadowTexture(), []);
  useEffect(() => () => pages.dispose(), [pages]);
  useEffect(() => () => shadow.dispose(), [shadow]);
  useEffect(() => {
    applied.current = -1;
  }, [pages]);

  useFrame(() => {
    if (story.open === applied.current || !spine.current || !front.current) return;
    applied.current = story.open;
    const rig = computeRig(story.open, lowPower ? 4 : 6);
    spine.current.rotation.z = rig.spine;
    front.current.position.set(rig.hingeFront[0], rig.hingeFront[1], 0);
    front.current.rotation.z = rig.cover;
    pages.update(rig);
  });

  return (
    <group>
      <QuranStand shadows={!lowPower} />
      <QuranCover spineRef={spine} frontRef={front} shadows={!lowPower} />
      <primitive object={pages.group} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, STAND_FLOOR, 0]} renderOrder={-1}>
        <planeGeometry args={[5.2, 3.8]} />
        <meshBasicMaterial map={shadow} transparent depthWrite={false} opacity={0.62} />
      </mesh>
    </group>
  );
}
