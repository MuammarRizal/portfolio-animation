import React, { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface OceanProps {
  quality: 'high' | 'low'
}

/**
 * Sea level. The island's cliffs drop to roughly y = -44 at the rim and the
 * underside cone reaches y = -50, so a surface at -30 leaves the island rising
 * out of the water while the rock root stays mostly submerged.
 */
const OCEAN_Y = -30
/**
 * Big enough that the far edge is always beyond the scene fog (near 100,
 * far 300), so the horizon dissolves into the sky instead of showing a seam.
 */
const OCEAN_SIZE = 1600

const vertexShader = /* glsl */ `
  uniform float uTime;

  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying float vCrest;

  // Sum of Gerstner waves. Returns the vertical/lateral displacement and
  // accumulates the surface tangents so the normal can be rebuilt with a cross
  // product. Steepness must stay well below 1 or the waves self-intersect.
  vec3 gerstner(vec2 dir, float steepness, float wavelength, vec3 p, float t, inout vec3 tangent, inout vec3 binormal) {
    float k = 6.283185307179586 / wavelength;
    float c = sqrt(9.8 / k);
    vec2 d = normalize(dir);
    float f = k * (dot(d, p.xz) - c * t);
    float a = steepness / k;
    float s = sin(f);
    float co = cos(f);

    tangent += vec3(-d.x * d.x * steepness * s, d.x * steepness * co, -d.x * d.y * steepness * s);
    binormal += vec3(-d.x * d.y * steepness * s, d.y * steepness * co, -d.y * d.y * steepness * s);

    return vec3(d.x * a * co, a * s, d.y * a * co);
  }

  void main() {
    // The geometry is pre-rotated into the XZ plane, so position.y is 0 and the
    // waves displace purely along Y.
    vec3 grid = position;
    vec3 tangent = vec3(1.0, 0.0, 0.0);
    vec3 binormal = vec3(0.0, 0.0, 1.0);
    vec3 disp = vec3(0.0);

    disp += gerstner(vec2(1.0, 0.32), 0.26, 90.0, grid, uTime, tangent, binormal);
    disp += gerstner(vec2(-0.55, 1.0), 0.20, 48.0, grid, uTime, tangent, binormal);
    disp += gerstner(vec2(0.42, -0.9), 0.16, 28.0, grid, uTime, tangent, binormal);

    vec3 displaced = grid + disp;
    // Sum of the three amplitudes is ~5.96, so /12 maps the range onto 0..1.
    vCrest = clamp(disp.y / 12.0 + 0.5, 0.0, 1.0);
    vNormal = normalize(mat3(modelMatrix) * normalize(cross(binormal, tangent)));

    vec4 worldPos = modelMatrix * vec4(displaced, 1.0);
    vWorldPos = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec3 uDeepColor;
  uniform vec3 uSurfaceColor;
  uniform vec3 uSkyColor;
  uniform vec3 uSunDir;
  uniform vec3 uSunColor;
  uniform vec3 uFogColor;
  uniform float uFogNear;
  uniform float uFogFar;

  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying float vCrest;

  // Cheap 2D ripple used only to perturb the shading normal — the geometry
  // itself only carries the three large swells.
  float ripple(vec2 p, float t) {
    return sin(p.x * 0.42 + t * 1.15) * 0.34
         + sin(p.y * 0.50 - t * 0.95) * 0.34
         + sin((p.x + p.y) * 0.31 + t * 0.70) * 0.24;
  }

  void main() {
    vec2 xz = vWorldPos.xz;

    float e = 1.1;
    float dhx = ripple(xz + vec2(e, 0.0), uTime) - ripple(xz - vec2(e, 0.0), uTime);
    float dhz = ripple(xz + vec2(0.0, e), uTime) - ripple(xz - vec2(0.0, e), uTime);
    vec3 rippleNormal = normalize(vec3(-dhx * 0.22, 1.0, -dhz * 0.22));

    vec3 N = normalize(vNormal * 0.72 + rippleNormal * 0.28);
    vec3 V = normalize(cameraPosition - vWorldPos);
    float fresnel = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 3.0);

    vec3 water = mix(uDeepColor, uSurfaceColor, clamp(vCrest, 0.0, 1.0) * 0.7 + fresnel * 0.3);
    vec3 color = mix(water, uSkyColor, fresnel * 0.55);

    // Sun glitter.
    vec3 halfDir = normalize(uSunDir + V);
    float specular = pow(max(dot(N, halfDir), 0.0), 140.0);
    color += uSunColor * specular * 0.9;

    // Foam riding the biggest crests.
    float foam = smoothstep(0.66, 0.92, vCrest);
    color = mix(color, vec3(0.92, 0.96, 1.0), foam * 0.4);

    // Blend into the scene fog so the far water meets the sky seamlessly.
    float dist = length(cameraPosition - vWorldPos);
    float fogFactor = clamp((dist - uFogNear) / (uFogFar - uFogNear), 0.0, 1.0);
    color = mix(color, uFogColor, fogFactor);

    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

/**
 * Gerstner-wave ocean.
 *
 * Fully procedural GLSL (no normal map, no texture, no CDN). The waves are
 * frozen on the 'low' tier — that is the kill switch: no per-frame uniform
 * update and a much coarser grid, so weak phones pay almost nothing for it.
 */
export const Ocean: React.FC<OceanProps> = ({ quality }) => {
  const segments = quality === 'low' ? 96 : 256

  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(OCEAN_SIZE, OCEAN_SIZE, segments, segments)
    g.rotateX(-Math.PI / 2)
    return g
  }, [segments])

  // The uniforms object is created once; the frame loop reaches it through a
  // ref so advancing uTime does not count as mutating a hook result (or a ref)
  // during render.
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uDeepColor: { value: new THREE.Color('#0b3450') },
      uSurfaceColor: { value: new THREE.Color('#2a86ad') },
      uSkyColor: { value: new THREE.Color('#cfe6ff') },
      uSunDir: { value: new THREE.Vector3(70, 92, 40).normalize() },
      uSunColor: { value: new THREE.Color('#fff3da') },
      uFogColor: { value: new THREE.Color('#cfe6ff') },
      uFogNear: { value: 100 },
      uFogFar: { value: 300 },
    }),
    []
  )
  const uniformsRef = useRef(uniforms)

  const material = useMemo(
    () => new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms }),
    [uniforms]
  )

  useFrame((state) => {
    // 'low': leave uTime at 0 so the surface stays still and cheap.
    if (quality === 'low') return
    uniformsRef.current.uTime.value = state.clock.elapsedTime
  })

  useEffect(() => () => geometry.dispose(), [geometry])
  useEffect(() => () => material.dispose(), [material])

  return <mesh geometry={geometry} material={material} position={[0, OCEAN_Y, 0]} />
}
