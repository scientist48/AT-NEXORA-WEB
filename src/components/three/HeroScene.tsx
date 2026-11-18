import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { PALETTE, StudioEnvironment, createFrameGeometry, pointOnRect } from './shared';

/**
 * THE NEXORA LINK
 * Three precision frames — Digital Engineering, Data Intelligence and AI —
 * joined as a Borromean link: no two frames are linked to each other, yet the
 * three cannot be separated. Remove one discipline and the structure falls apart.
 */

const LONG = 3.3;
const SHORT = 2.1;
const BAND = 0.26;
const DEPTH = 0.3;
const RADIUS = 0.16;

interface SceneProps {
  lite: boolean;
  frozen: boolean;
  /** Index of the discipline currently highlighted from the DOM legend (-1 = none). */
  activeRef: React.RefObject<number>;
  pointerRef: React.RefObject<{ x: number; y: number }>;
  onReady: () => void;
}

const BAR_LENGTHS = [0.14, 0.22, 0.18, 0.3, 0.24, 0.36, 0.2, 0.28, 0.4, 0.26, 0.34, 0.44];

function Sculpture({ lite, frozen, activeRef, pointerRef, onReady }: SceneProps) {
  const root = useRef<THREE.Group>(null);
  const frames = useRef<(THREE.Group | null)[]>([]);
  const core = useRef<THREE.Mesh>(null);
  const pulse = useRef<THREE.Mesh>(null);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const ready = useRef(false);
  const time = useRef(0);

  const geo = useMemo(
    () => ({
      frame: createFrameGeometry(LONG, SHORT, BAND, DEPTH, RADIUS),
      cap: createFrameGeometry(LONG - 0.16, SHORT - 0.16, 0.1, 0.035, RADIUS - 0.06, 0.008),
      glass: createFrameGeometry(SHORT, LONG, BAND, DEPTH, RADIUS),
      aiFrame: createFrameGeometry(SHORT, LONG, BAND, DEPTH, RADIUS),
      inlay: createFrameGeometry(SHORT - BAND + 0.04, LONG - BAND + 0.04, 0.04, 0.03, RADIUS - 0.08, 0),
    }),
    [],
  );
  useEffect(() => () => Object.values(geo).forEach((g) => g.dispose()), [geo]);

  useFrame((_, delta) => {
    if (!ready.current) {
      ready.current = true;
      onReady();
    }
    const dt = Math.min(delta, 0.05);
    if (!frozen) time.current += dt;
    const t = time.current;
    const g = root.current;
    if (!g) return;

    const p = pointerRef.current;
    const targetY = -0.62 + t * 0.07 + p.x * 0.28;
    const targetX = 0.4 + Math.sin(t * 0.35) * 0.04 - p.y * 0.16;
    const k = frozen ? 1 : 1 - Math.exp(-dt * 3.2);
    g.rotation.y += (targetY - g.rotation.y) * k;
    g.rotation.x += (targetX - g.rotation.x) * k;
    g.position.y = Math.sin(t * 0.6) * 0.06;

    const active = activeRef.current;
    frames.current.forEach((f, i) => {
      if (!f) return;
      const s = active === i ? 1.06 : active === -1 ? 1 : 0.985;
      f.scale.x += (s - f.scale.x) * k;
      f.scale.y = f.scale.z = f.scale.x;
    });

    if (core.current) {
      core.current.rotation.y = t * 0.4;
      core.current.rotation.x = t * 0.25;
    }
    if (pulse.current) {
      pointOnRect(SHORT - BAND, LONG - BAND, 0.7 + t * 0.06, tmp);
      pulse.current.position.set(tmp.x, tmp.y, -(DEPTH / 2 + 0.02));
    }
  });

  return (
    <group ref={root} rotation={[0.4, -0.62, 0.1]}>
      {/* 01 — DIGITAL ENGINEERING: laminated navy metal frame, XY plane */}
      <group ref={(el) => void (frames.current[0] = el)}>
        <mesh geometry={geo.frame}>
          <meshPhysicalMaterial color={PALETTE.navy} metalness={0.92} roughness={0.3} clearcoat={0.6} clearcoatRoughness={0.25} envMapIntensity={1.25} />
        </mesh>
        {[1, -1].map((side) => (
          <mesh key={side} geometry={geo.cap} position={[0, 0, side * (DEPTH / 2 + 0.012)]}>
            <meshStandardMaterial color="#c9d3e3" metalness={1} roughness={0.16} envMapIntensity={1.4} />
          </mesh>
        ))}
        {[-1, 1].flatMap((sx) =>
          [-1, 1].map((sy) => (
            <mesh
              key={`${sx}${sy}`}
              position={[sx * (LONG / 2 - BAND / 2), sy * (SHORT / 2 - BAND / 2), DEPTH / 2 + 0.03]}
              rotation-x={Math.PI / 2}
            >
              <cylinderGeometry args={[0.034, 0.034, 0.03, 20]} />
              <meshStandardMaterial color={PALETTE.silver} metalness={1} roughness={0.2} />
            </mesh>
          )),
        )}
      </group>

      {/* 02 — DATA INTELLIGENCE: ice glass frame carrying measured bars, YZ plane */}
      <group ref={(el) => void (frames.current[1] = el)} rotation-y={Math.PI / 2}>
        <mesh geometry={geo.glass}>
          {lite ? (
            <meshPhysicalMaterial color="#cfe0f5" metalness={0.1} roughness={0.06} transparent opacity={0.58} clearcoat={1} envMapIntensity={1.6} />
          ) : (
            <meshPhysicalMaterial
              color="#eaf2fc"
              transmission={1}
              thickness={0.7}
              ior={1.42}
              roughness={0.07}
              metalness={0}
              clearcoat={1}
              clearcoatRoughness={0.05}
              attenuationColor="#8fb6e8"
              attenuationDistance={1.1}
              envMapIntensity={1.3}
            />
          )}
        </mesh>
        {[-1, 1].flatMap((side) =>
          BAR_LENGTHS.map((len, i) => {
            const y = -1.1 + (i * 2.2) / (BAR_LENGTHS.length - 1);
            if (Math.abs(y) < 0.12) return null;
            const length = side === 1 ? len : BAR_LENGTHS[BAR_LENGTHS.length - 1 - i] * 0.8;
            const highlight = side === 1 && i === BAR_LENGTHS.length - 1;
            return (
              <mesh key={`${side}-${i}`} position={[side * (SHORT / 2 - BAND - length / 2 + 0.01), y, 0]}>
                <boxGeometry args={[length, 0.07, 0.1]} />
                {highlight ? (
                  <meshStandardMaterial color={PALETTE.lime} emissive={PALETTE.lime} emissiveIntensity={0.2} roughness={0.35} />
                ) : (
                  <meshStandardMaterial color="#27456f" metalness={0.85} roughness={0.28} />
                )}
              </mesh>
            );
          }),
        )}
      </group>

      {/* 03 — AI & AUTOMATION: pale alloy frame with a live signal path, ZX plane */}
      <group ref={(el) => void (frames.current[2] = el)} rotation-x={Math.PI / 2}>
        <mesh geometry={geo.aiFrame}>
          <meshPhysicalMaterial color="#eef1f7" metalness={0.75} roughness={0.2} clearcoat={1} clearcoatRoughness={0.12} envMapIntensity={1.15} />
        </mesh>
        <mesh geometry={geo.inlay} position={[0, 0, -(DEPTH / 2 + 0.004)]}>
          <meshStandardMaterial color={PALETTE.lime} emissive={PALETTE.lime} emissiveIntensity={0.25} roughness={0.4} />
        </mesh>
        {[0.08, 0.33, 0.58, 0.83].map((u) => {
          const pt = pointOnRect(SHORT - BAND, LONG - BAND, u, new THREE.Vector3());
          return (
            <mesh key={u} position={[pt.x, pt.y, -(DEPTH / 2 + 0.02)]}>
              <sphereGeometry args={[0.05, 20, 20]} />
              <meshStandardMaterial color={PALETTE.navy} metalness={0.9} roughness={0.2} />
            </mesh>
          );
        })}
        <mesh ref={pulse} position={[-(SHORT - BAND) / 2, -(LONG - BAND) / 2, -(DEPTH / 2 + 0.02)]}>
          <sphereGeometry args={[0.075, 24, 24]} />
          <meshStandardMaterial color={PALETTE.lime} emissive={PALETTE.lime} emissiveIntensity={0.45} roughness={0.3} />
        </mesh>
      </group>

      {/* Shared core and the three axes that tie each discipline to it */}
      <mesh ref={core}>
        <icosahedronGeometry args={[0.34, 0]} />
        <meshPhysicalMaterial color={PALETTE.navyDeep} metalness={1} roughness={0.16} flatShading envMapIntensity={1.6} />
      </mesh>
      {(
        [
          [0, 0, Math.PI / 2],
          [0, 0, 0],
          [Math.PI / 2, 0, 0],
        ] as const
      ).map((rotation, i) => (
        <mesh key={i} rotation={rotation}>
          <cylinderGeometry args={[0.014, 0.014, (SHORT - BAND * 2) * 1, 10]} />
          <meshStandardMaterial color="#b9c5d8" metalness={1} roughness={0.22} />
        </mesh>
      ))}
    </group>
  );
}

export default function HeroScene(props: SceneProps & { active: boolean }) {
  const { lite, frozen, active } = props;
  return (
    <Canvas
      frameloop={active ? 'always' : 'never'}
      dpr={frozen ? 2 : lite ? [1, 1.5] : [1, 2]}
      camera={{ fov: 28, position: [0, 0.5, 11.2], near: 1, far: 40 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: frozen }}
      onCreated={({ gl, camera }) => {
        gl.toneMapping = THREE.NeutralToneMapping;
        gl.toneMappingExposure = 1.0;
        camera.lookAt(0, -0.25, 0);
      }}
      style={{ position: 'absolute', inset: 0, touchAction: 'pan-y' }}
      aria-hidden="true"
    >
      <ambientLight intensity={0.35} />
      <directionalLight position={[4, 7, 5]} intensity={1.4} />
      <directionalLight position={[-6, 2, -2]} intensity={0.5} color={PALETTE.ice} />
      <StudioEnvironment />
      <Sculpture {...props} />
      <ContactShadows
        position={[0, -2.45, 0]}
        scale={11}
        far={5}
        blur={2.8}
        opacity={0.34}
        resolution={lite ? 256 : 512}
        frames={lite ? 1 : Infinity}
        color={PALETTE.navy}
      />
    </Canvas>
  );
}
