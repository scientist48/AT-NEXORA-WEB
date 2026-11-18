import { Environment, Lightformer } from '@react-three/drei';
import * as THREE from 'three';

export const PALETTE = {
  pearl: '#F7F8FC',
  navy: '#142B4A',
  navyDeep: '#0E2038',
  ink: '#101827',
  ice: '#DCE9F8',
  lime: '#B8F34A',
  silver: '#E5E9F2',
} as const;

/** Procedural studio lighting — no HDR download, rendered once into a small cube map. */
export function StudioEnvironment() {
  return (
    <Environment resolution={256} frames={1}>
      <color attach="background" args={['#eef2f9']} />
      {/* Key: large soft top light */}
      <Lightformer form="rect" intensity={3.2} position={[0, 6, 1]} rotation-x={Math.PI / 2} scale={[12, 12, 1]} color="#ffffff" />
      {/* Ice-blue wash from the left */}
      <Lightformer form="rect" intensity={2.4} position={[-7, 1, 2]} rotation-y={Math.PI / 2} scale={[10, 5, 1]} color={PALETTE.ice} />
      {/* Crisp strip lights give metal its edge definition */}
      <Lightformer form="rect" intensity={5} position={[6, 2.5, 3]} rotation-y={-Math.PI / 2.4} scale={[0.5, 9, 1]} color="#ffffff" />
      <Lightformer form="rect" intensity={3} position={[2, -1, 7]} scale={[0.4, 8, 1]} rotation-z={Math.PI / 5} color="#ffffff" />
      {/* Navy "negative fill" so reflections have depth instead of flat white */}
      <Lightformer form="rect" intensity={0.9} position={[0, -6, 0]} rotation-x={-Math.PI / 2} scale={[14, 14, 1]} color={PALETTE.navy} />
      <Lightformer form="rect" intensity={0.8} position={[7, -1, -4]} rotation-y={-Math.PI / 2} scale={[8, 6, 1]} color={PALETTE.navy} />
      <Lightformer form="rect" intensity={0.6} position={[0, 0, -8]} scale={[10, 5, 1]} color={PALETTE.navyDeep} />
    </Environment>
  );
}

function roundedRectPath<T extends THREE.Path>(path: T, w: number, h: number, r: number): T {
  const x = -w / 2;
  const y = -h / 2;
  path.moveTo(x + r, y);
  path.lineTo(x + w - r, y);
  path.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  path.lineTo(x + w, y + h - r);
  path.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
  path.lineTo(x + r, y + h);
  path.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
  path.lineTo(x, y + r);
  path.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  return path;
}

/** A bevelled rectangular ring (frame) lying in the XY plane, centred on the origin. */
export function createFrameGeometry(w: number, h: number, band: number, depth: number, radius: number, bevel = 0.025) {
  const shape = roundedRectPath(new THREE.Shape(), w, h, radius);
  shape.holes.push(roundedRectPath(new THREE.Path(), w - band * 2, h - band * 2, Math.max(radius - band, 0.02)));
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: depth - bevel * 2,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 3,
    curveSegments: 12,
  });
  geometry.center();
  return geometry;
}

/** Point on the centre line of a w×h rectangle, u ∈ [0,1) travelling anticlockwise. */
export function pointOnRect(w: number, h: number, u: number, target: THREE.Vector3) {
  const perimeter = 2 * (w + h);
  let d = (((u % 1) + 1) % 1) * perimeter;
  if (d < w) return target.set(-w / 2 + d, -h / 2, 0);
  d -= w;
  if (d < h) return target.set(w / 2, -h / 2 + d, 0);
  d -= h;
  if (d < w) return target.set(w / 2 - d, h / 2, 0);
  d -= w;
  return target.set(-w / 2, h / 2 - d, 0);
}
