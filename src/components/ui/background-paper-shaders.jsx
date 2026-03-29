import { useMemo, useRef } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import * as THREE from "three"

const vertexShader = `
  uniform float time;
  uniform float intensity;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vec3 pos = position;
    pos.y += sin(pos.x * 10.0 + time) * 0.1 * intensity;
    pos.x += cos(pos.y * 8.0 + time * 1.5) * 0.05 * intensity;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`

const fragmentShader = `
  uniform float time;
  uniform float intensity;
  uniform vec3 color1;
  uniform vec3 color2;
  varying vec2 vUv;

  void main() {
    vec2 uv = vUv;
    float noise = sin(uv.x * 20.0 + time) * cos(uv.y * 15.0 + time * 0.8);
    noise += sin(uv.x * 35.0 - time * 2.0) * cos(uv.y * 25.0 + time * 1.2) * 0.5;

    vec3 color = mix(color1, color2, noise * 0.5 + 0.5);
    color = mix(color, vec3(1.0), pow(abs(noise), 2.0) * intensity);

    float glow = 1.0 - length(uv - 0.5) * 2.0;
    glow = pow(glow, 2.0);

    gl_FragColor = vec4(color * glow, glow * 0.9);
  }
`

function ShaderPlane({
  position,
  rotation = [0, 0, 0],
  color1 = "#101010",
  color2 = "#ffffff",
  speed = 1,
  scale = 1,
}) {
  const mesh = useRef(null)
  const uniforms = useMemo(
    () => ({
      time: { value: 0 },
      intensity: { value: 1.0 },
      color1: { value: new THREE.Color(color1) },
      color2: { value: new THREE.Color(color2) },
    }),
    [color1, color2]
  )

  useFrame((state) => {
    const material = mesh.current?.material
    if (material && "uniforms" in material) {
      material.uniforms.time.value = state.clock.elapsedTime * speed
      material.uniforms.intensity.value = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.35
    }
    if (mesh.current) {
      mesh.current.rotation.z += 0.0008 * speed
    }
  })

  return (
    <mesh ref={mesh} position={position} rotation={rotation} scale={scale}>
      <planeGeometry args={[2.5, 2.5, 64, 64]} />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        side={THREE.DoubleSide}
        depthWrite={false}
        blending={THREE.NormalBlending}
      />
    </mesh>
  )
}

function EnergyRing({
  radius = 1.1,
  position = [0, 0, 0],
  speed = 1,
  color = "#f97316",
  tilt = [0, 0, 0],
}) {
  const mesh = useRef(null)
  const material = useRef(null)

  useFrame((state) => {
    if (!mesh.current || !material.current) {
      return
    }
    mesh.current.rotation.z = state.clock.elapsedTime * speed
    mesh.current.rotation.x = tilt[0]
    mesh.current.rotation.y = tilt[1]
    material.current.opacity = 0.28 + Math.sin(state.clock.elapsedTime * 2.5) * 0.14
  })

  return (
    <mesh ref={mesh} position={position}>
      <ringGeometry args={[radius * 0.87, radius, 64]} />
      <meshBasicMaterial
        ref={material}
        color={color}
        transparent
        opacity={0.3}
        side={THREE.DoubleSide}
        depthWrite={false}
        blending={THREE.NormalBlending}
      />
    </mesh>
  )
}

export function BackgroundPaperShaders() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-black" />

      <Canvas
        className="absolute inset-0"
        camera={{ position: [0, 0, 2.8], fov: 50 }}
        dpr={[1, 1.5]}
        gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}>
        <ambientLight intensity={0.55} />

        <group position={[0, 0, 0]}>
          <ShaderPlane
            position={[-0.65, 0.2, -0.25]}
            rotation={[0, 0.2, -0.15]}
            color1="#2c2c2c"
            color2="#f2f2f2"
            speed={0.38}
            scale={1.9}
          />
          <ShaderPlane
            position={[0.85, -0.35, -0.15]}
            rotation={[0, -0.18, 0.12]}
            color1="#242424"
            color2="#d8d8d8"
            speed={0.48}
            scale={1.45}
          />
          <ShaderPlane
            position={[0, -0.88, -0.35]}
            rotation={[0, 0, 0.3]}
            color1="#191919"
            color2="#b2b2b2"
            speed={0.28}
            scale={1.3}
          />
          <EnergyRing radius={1.55} speed={0.24} color="#ff7a18" tilt={[0.25, 0.1, 0]} />
          <EnergyRing radius={1.08} speed={-0.38} color="#7b7b7b" tilt={[-0.18, -0.15, 0]} />
        </group>
      </Canvas>

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(249,115,22,0.24),transparent_40%),radial-gradient(circle_at_80%_74%,rgba(255,255,255,0.12),transparent_50%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.05),transparent_35%,rgba(249,115,22,0.08),transparent_72%)]" />
      <div className="absolute inset-0 opacity-[0.11] [background-image:radial-gradient(circle_at_center,white_0.5px,transparent_0.7px)] [background-size:3px_3px]" />
    </div>
  )
}
