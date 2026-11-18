import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { PALETTE, StudioEnvironment, createFrameGeometry } from './shared';

/**
 * THE CONNECTED STACK
 * An exploded, isometric model of how the three divisions work as one system:
 * software at the base, data in the middle, AI on top — with signals travelling
 * up (records → context) and back down (decisions → actions).
 */

const SIZE = 3.4;
const GAP = 1.75;
const LAYER_Y = [-GAP, 0, GAP];

const MODULES: [number, number, number][] = [
  [-1, -1, 0.26], [0, -1, 0.42], [1, -1, 0.2],
  [-1, 0, 0.5], [0, 0, 0.3], [1, 0, 0.24],
  [-1, 1, 0.34], [0, 1, 0.22], [1, 1, 0.46],
];
const BARS = [0.22, 0.34, 0.3, 0.48, 0.6, 0.78];
const NODES: [number, number][] = [[0, 0], [-1.05, -0.7], [1.0, -0.85], [1.1, 0.6], [-0.2, 1.1], [-1.15, 0.55]];
const LINKS: [number, number][] = [[0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [1, 5], [2, 3], [4, 5]];
/** Vertical signal channels: [x, z, direction, phase] */
const CHANNELS: [number, number, 1 | -1, number][] = [
  [-1.25, -1.25, 1, 0],
  [1.25, 1.25, 1, 0.5],
  [1.25, -1.25, -1, 0.25],
];

interface Props {
  selected: number;
  onSelect: (index: number) => void;
  lite: boolean;
  frozen: boolean;
  onReady: () => void;
}

function ResponsiveCamera() {
  const { camera, size } = useThree();
  useEffect(() => {
    const cam = camera as THREE.OrthographicCamera;
    cam.zoom = Math.min(size.width / 6.3, size.height / 7.0);
    cam.position.set(6, 4, 6);
    cam.lookAt(0, 0.25, 0);
    cam.updateProjectionMatrix();
  }, [camera, size]);
  return null;
}

function Link({ a, b }: { a: THREE.Vector3; b: THREE.Vector3 }) {
  const { position, quaternion, length } = useMemo(() => {
    const dir = new THREE.Vector3().subVectors(b, a);
    return {
      position: new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5),
      quaternion: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize()),
      length: dir.length(),
    };
  }, [a, b]);
  return (
    <mesh position={position} quaternion={quaternion}>
      <cylinderGeometry args={[0.012, 0.012, length, 8]} />
      <meshStandardMaterial color={PALETTE.navy} metalness={0.8} roughness={0.3} />
    </mesh>
  );
}

function Stack({ selected, onSelect, frozen, onReady }: Props) {
  const root = useRef<THREE.Group>(null);
  const layers = useRef<(THREE.Group | null)[]>([]);
  const ring = useRef<THREE.Mesh>(null);
  const pulses = useRef<(THREE.Mesh | null)[]>([]);
  const time = useRef(0);
  const ready = useRef(false);

  const ringGeo = useMemo(() => createFrameGeometry(SIZE + 0.4, SIZE + 0.4, 0.05, 0.05, 0.14, 0), []);
  useEffect(() => () => ringGeo.dispose(), [ringGeo]);
  const nodePoints = useMemo(() => NODES.map(([x, z], i) => new THREE.Vector3(x, i === 0 ? 0.62 : 0.4, z)), []);

  useFrame((_, delta) => {
    if (!ready.current) {
      ready.current = true;
      onReady();
    }
    const dt = Math.min(delta, 0.05);
    if (!frozen) time.current += dt;
    const t = time.current;
    const k = frozen ? 1 : 1 - Math.exp(-dt * 6);

    if (root.current) root.current.rotation.y = Math.sin(t * 0.25) * 0.14;
    layers.current.forEach((g, i) => {
      if (!g) return;
      const y = LAYER_Y[i] + (i === selected ? 0.14 : 0);
      g.position.y += (y - g.position.y) * k;
    });
    if (ring.current) {
      const y = LAYER_Y[selected] + 0.14;
      ring.current.position.y += (y - ring.current.position.y) * k;
    }
    pulses.current.forEach((m, i) => {
      if (!m) return;
      const [, , dir, phase] = CHANNELS[i];
      const u = (t * 0.22 + phase) % 1;
      const eased = u * u * (3 - 2 * u);
      m.position.y = dir === 1 ? -GAP + eased * GAP * 2 : GAP - eased * GAP * 2;
      const s = 0.6 + Math.sin(u * Math.PI) * 0.6;
      m.scale.setScalar(s);
    });
  });

  const handlers = (i: number) => ({
    onClick: (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      onSelect(i);
    },
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      document.body.style.cursor = 'pointer';
    },
    onPointerOut: () => {
      document.body.style.cursor = '';
    },
  });

  return (
    <group ref={root}>
      {/* 01 — Software: navy base carrying application modules */}
      <group ref={(el) => void (layers.current[0] = el)} position-y={LAYER_Y[0]} {...handlers(0)}>
        <RoundedBox args={[SIZE, 0.18, SIZE]} radius={0.06} smoothness={4}>
          <meshPhysicalMaterial color={PALETTE.navy} metalness={0.9} roughness={0.32} clearcoat={0.5} envMapIntensity={1.2} />
        </RoundedBox>
        {MODULES.map(([x, z, h], i) => (
          <group key={i} position={[x * 0.98, 0.09 + h / 2, z * 0.98]}>
            <mesh>
              <boxGeometry args={[0.72, h, 0.72]} />
              <meshStandardMaterial color={i % 2 ? '#1d3a61' : '#233f69'} metalness={0.85} roughness={0.3} />
            </mesh>
            <mesh position-y={h / 2 + 0.006}>
              <boxGeometry args={[0.5, 0.012, 0.5]} />
              <meshStandardMaterial
                color={i === 3 ? PALETTE.lime : '#c9d3e3'}
                emissive={i === 3 ? PALETTE.lime : '#000000'}
                emissiveIntensity={i === 3 ? 0.2 : 0}
                metalness={i === 3 ? 0.1 : 1}
                roughness={0.25}
              />
            </mesh>
          </group>
        ))}
      </group>

      {/* 02 — Data: glass plane carrying measures */}
      <group ref={(el) => void (layers.current[1] = el)} position-y={LAYER_Y[1]} {...handlers(1)}>
        <RoundedBox args={[SIZE, 0.14, SIZE]} radius={0.06} smoothness={4}>
          <meshPhysicalMaterial color="#b3cdee" metalness={0.05} roughness={0.08} transparent opacity={0.72} clearcoat={1} clearcoatRoughness={0.05} envMapIntensity={1.5} />
        </RoundedBox>
        {BARS.map((h, i) => (
          <mesh key={i} position={[-0.7 + i * 0.36, 0.07 + h / 2, 1.05]}>
            <boxGeometry args={[0.24, h, 0.24]} />
            {i === BARS.length - 1 ? (
              <meshStandardMaterial color={PALETTE.lime} emissive={PALETTE.lime} emissiveIntensity={0.2} roughness={0.35} />
            ) : (
              <meshStandardMaterial color={PALETTE.navy} metalness={0.85} roughness={0.28} />
            )}
          </mesh>
        ))}
        <mesh position={[0.2, 0.1, -0.6]} rotation-x={-Math.PI / 2}>
          <torusGeometry args={[0.46, 0.085, 4, 48, Math.PI * 1.5]} />
          <meshStandardMaterial color={PALETTE.navy} metalness={0.85} roughness={0.28} />
        </mesh>
        <mesh position={[0.2, 0.1, -0.6]} rotation={[-Math.PI / 2, 0, Math.PI * 1.56]}>
          <torusGeometry args={[0.46, 0.085, 4, 16, Math.PI * 0.38]} />
          <meshStandardMaterial color="#ffffff" metalness={0.3} roughness={0.3} />
        </mesh>
        {[-0.2, 0.1, 0.4].map((z, i) => (
          <mesh key={z} position={[1.0, 0.08, z + 0.15]} rotation-y={Math.PI / 2}>
            <boxGeometry args={[0.9 - i * 0.2, 0.02, 0.07]} />
            <meshStandardMaterial color="#ffffff" metalness={0.2} roughness={0.4} />
          </mesh>
        ))}
      </group>

      {/* 03 — AI: pale alloy plane carrying a small reasoning network */}
      <group ref={(el) => void (layers.current[2] = el)} position-y={LAYER_Y[2]} {...handlers(2)}>
        <RoundedBox args={[SIZE, 0.14, SIZE]} radius={0.06} smoothness={4}>
          <meshPhysicalMaterial color="#f1f4f9" metalness={0.6} roughness={0.24} clearcoat={1} clearcoatRoughness={0.15} envMapIntensity={1.1} />
        </RoundedBox>
        {LINKS.map(([a, b], i) => (
          <Link key={i} a={nodePoints[a]} b={nodePoints[b]} />
        ))}
        {nodePoints.map((p, i) => (
          <group key={i}>
            <mesh position={p}>
              <sphereGeometry args={[i === 0 ? 0.2 : 0.1, 28, 28]} />
              {i === 0 ? (
                <meshStandardMaterial color={PALETTE.lime} emissive={PALETTE.lime} emissiveIntensity={0.25} roughness={0.3} />
              ) : (
                <meshStandardMaterial color={PALETTE.navy} metalness={0.9} roughness={0.2} />
              )}
            </mesh>
            <mesh position={[p.x, (p.y + 0.07) / 2, p.z]}>
              <cylinderGeometry args={[0.01, 0.01, p.y - 0.07, 8]} />
              <meshStandardMaterial color="#b9c5d8" metalness={1} roughness={0.25} />
            </mesh>
          </group>
        ))}
      </group>

      {/* Signal channels between the layers */}
      {CHANNELS.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh>
            <cylinderGeometry args={[0.016, 0.016, GAP * 2 + 0.3, 10]} />
            <meshStandardMaterial color="#b9c5d8" metalness={1} roughness={0.22} />
          </mesh>
          <mesh ref={(el) => void (pulses.current[i] = el)}>
            <sphereGeometry args={[0.075, 20, 20]} />
            <meshStandardMaterial color={PALETTE.lime} emissive={PALETTE.lime} emissiveIntensity={0.45} roughness={0.3} />
          </mesh>
        </group>
      ))}

      {/* Selection ring */}
      <mesh ref={ring} geometry={ringGeo} rotation-x={Math.PI / 2} position-y={LAYER_Y[selected] + 0.14}>
        <meshStandardMaterial color={PALETTE.lime} emissive={PALETTE.lime} emissiveIntensity={0.35} roughness={0.4} />
      </mesh>
    </group>
  );
}

export default function EcosystemScene(props: Props & { active: boolean }) {
  const { lite, frozen, active } = props;
  return (
    <Canvas
      orthographic
      frameloop={active ? 'always' : 'never'}
      dpr={frozen ? 2 : lite ? [1, 1.5] : [1, 2]}
      camera={{ position: [6, 4, 6], zoom: 80, near: 0.1, far: 60 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: frozen }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.NeutralToneMapping;
        gl.toneMappingExposure = 1.0;
      }}
      style={{ position: 'absolute', inset: 0, touchAction: 'pan-y' }}
      aria-hidden="true"
    >
      <ResponsiveCamera />
      <ambientLight intensity={0.4} />
      <directionalLight position={[3, 8, 4]} intensity={1.5} />
      <directionalLight position={[-6, 3, -2]} intensity={0.5} color={PALETTE.ice} />
      <StudioEnvironment />
      <Stack {...props} />
    </Canvas>
  );
}
