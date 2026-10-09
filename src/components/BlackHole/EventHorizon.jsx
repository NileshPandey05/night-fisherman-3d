import React from 'react'
import * as THREE from 'three'

/**
 * EventHorizon Component
 * Represents the Schwarzschild black hole's boundary where escape velocity equals c.
 * Radius Rs = 2GM/c^2 (normalized to 1.0 * mass).
 * Completely black, absorbing all incident light.
 */
export function EventHorizon({ mass = 1.0 }) {
  const rs = 1.0 * mass

  return (
    <group>
      {/* Central Absorbing Event Horizon Sphere */}
      <mesh>
        <sphereGeometry args={[rs, 64, 64]} />
        <meshBasicMaterial color="#000000" />
      </mesh>

      {/* Extreme Gravitational Redshift Boundary (just outside horizon at r = 1.02 * Rs) */}
      <mesh>
        <sphereGeometry args={[rs * 1.03, 48, 48]} />
        <meshBasicMaterial
          color="#150008"
          transparent
          opacity={0.7}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  )
}
