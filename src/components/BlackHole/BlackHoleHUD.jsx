import React, { useState } from 'react'

export function BlackHoleHUD({
  mass,
  setMass,
  particleCount,
  setParticleCount,
  driftSpeed,
  setDriftSpeed,
  dopplerStrength,
  setDopplerStrength,
  lensingStrength,
  setLensingStrength,
  photonRingEnabled,
  setPhotonRingEnabled,
  jetsEnabled,
  setJetsEnabled,
  bloomEnabled,
  setBloomEnabled,
  cameraPreset,
  setCameraPreset
}) {
  const [collapsed, setCollapsed] = useState(false)

  const rs = (1.0 * mass).toFixed(2)
  const isco = (3.0 * mass).toFixed(2)
  const shadow = (2.598 * mass).toFixed(2)

  return (
    <div
      style={{
        position: 'absolute',
        top: 68,
        right: 16,
        zIndex: 1000,
        width: 320,
        background: 'rgba(8, 14, 24, 0.88)',
        backdropFilter: 'blur(14px)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: 12,
        padding: 16,
        color: '#e2e8f0',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: 12,
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.65)'
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#ffb950', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>🕳️</span>
            <span>Black Hole Simulation</span>
          </div>
          <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
            Astrophysical General Relativity & GPU Disk
          </div>
        </div>
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            border: 'none',
            borderRadius: 4,
            color: '#cbd5e1',
            padding: '3px 8px',
            fontSize: 11,
            cursor: 'pointer'
          }}
        >
          {collapsed ? 'Expand' : 'Collapse'}
        </button>
      </div>

      {!collapsed && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Quality / Particle Count Pills */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#cbd5e1', marginBottom: 6 }}>
              Particle Count ({particleCount.toLocaleString()} Tracers):
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
              {[
                { label: '10K', count: 10000 },
                { label: '25K', count: 25000 },
                { label: '50K', count: 50000 },
                { label: '100K', count: 100000 }
              ].map(q => (
                <button
                  key={q.count}
                  type="button"
                  onClick={() => setParticleCount(q.count)}
                  style={{
                    padding: '5px 0',
                    border: 'none',
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: particleCount === q.count ? '#ffb950' : 'rgba(255, 255, 255, 0.06)',
                    color: particleCount === q.count ? '#0f172a' : '#94a3b8'
                  }}
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sliders */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Mass */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ color: '#94a3b8' }}>Black Hole Mass (M):</span>
                <span style={{ fontWeight: 600, color: '#f1f5f9' }}>{mass.toFixed(2)} M☉</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.2"
                step="0.05"
                value={mass}
                onChange={e => setMass(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: '#ffb950' }}
              />
            </div>

            {/* Inward Drift Speed */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ color: '#94a3b8' }}>Viscous Inward Drift:</span>
                <span style={{ fontWeight: 600, color: '#f1f5f9' }}>{driftSpeed.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="2.5"
                step="0.1"
                value={driftSpeed}
                onChange={e => setDriftSpeed(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: '#ffb950' }}
              />
            </div>

            {/* Relativistic Doppler Beaming */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ color: '#94a3b8' }}>Doppler Beaming Boost:</span>
                <span style={{ fontWeight: 600, color: '#f1f5f9' }}>{dopplerStrength.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="2.0"
                step="0.1"
                value={dopplerStrength}
                onChange={e => setDopplerStrength(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: '#ffb950' }}
              />
            </div>

            {/* Gravitational Lensing Strength */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ color: '#94a3b8' }}>Gravitational Lensing:</span>
                <span style={{ fontWeight: 600, color: '#f1f5f9' }}>{lensingStrength.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="2.0"
                step="0.1"
                value={lensingStrength}
                onChange={e => setLensingStrength(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: '#ffb950' }}
              />
            </div>
          </div>

          {/* Toggle Switches */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, paddingTop: 4 }}>
            <button
              type="button"
              onClick={() => setPhotonRingEnabled(!photonRingEnabled)}
              style={{
                padding: '6px 4px',
                border: 'none',
                borderRadius: 6,
                fontSize: 10,
                fontWeight: 600,
                cursor: 'pointer',
                background: photonRingEnabled ? 'rgba(255, 185, 80, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                color: photonRingEnabled ? '#ffb950' : '#64748b',
                borderWidth: 1,
                borderStyle: 'solid',
                borderColor: photonRingEnabled ? 'rgba(255, 185, 80, 0.4)' : 'transparent'
              }}
            >
              💫 Photon Ring
            </button>

            <button
              type="button"
              onClick={() => setJetsEnabled(!jetsEnabled)}
              style={{
                padding: '6px 4px',
                border: 'none',
                borderRadius: 6,
                fontSize: 10,
                fontWeight: 600,
                cursor: 'pointer',
                background: jetsEnabled ? 'rgba(96, 165, 250, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                color: jetsEnabled ? '#93c5fd' : '#64748b',
                borderWidth: 1,
                borderStyle: 'solid',
                borderColor: jetsEnabled ? 'rgba(96, 165, 250, 0.4)' : 'transparent'
              }}
            >
              ⚡ Polar Jets
            </button>

            <button
              type="button"
              onClick={() => setBloomEnabled(!bloomEnabled)}
              style={{
                padding: '6px 4px',
                border: 'none',
                borderRadius: 6,
                fontSize: 10,
                fontWeight: 600,
                cursor: 'pointer',
                background: bloomEnabled ? 'rgba(244, 63, 94, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                color: bloomEnabled ? '#fda4af' : '#64748b',
                borderWidth: 1,
                borderStyle: 'solid',
                borderColor: bloomEnabled ? 'rgba(244, 63, 94, 0.4)' : 'transparent'
              }}
            >
              ✨ Bloom Glow
            </button>
          </div>

          {/* Camera View Presets */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#cbd5e1', marginBottom: 6 }}>
              Camera Perspectives:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 4 }}>
              {[
                { id: 'cinematic', label: '🎬 Cinematic' },
                { id: 'edge_on', label: '📐 Edge-On' },
                { id: 'polar', label: '🔭 Top Polar' },
                { id: 'horizon_closeup', label: '👁️ Close-Up' }
              ].map(cam => (
                <button
                  key={cam.id}
                  type="button"
                  onClick={() => setCameraPreset(cam.id)}
                  style={{
                    padding: '5px 8px',
                    border: 'none',
                    borderRadius: 4,
                    fontSize: 10,
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: cameraPreset === cam.id ? 'rgba(255, 185, 80, 0.25)' : 'rgba(255, 255, 255, 0.06)',
                    color: cameraPreset === cam.id ? '#ffb950' : '#94a3b8',
                    textAlign: 'left'
                  }}
                >
                  {cam.label}
                </button>
              ))}
            </div>
          </div>

          {/* Astrophysical Telemetry Box */}
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.45)',
              borderRadius: 6,
              padding: 8,
              fontSize: 10,
              fontFamily: 'monospace',
              color: '#94a3b8',
              lineHeight: 1.5,
              border: '1px solid rgba(255, 255, 255, 0.06)'
            }}
          >
            <div><strong>Rs (Horizon):</strong> {rs} u (2GM/c²)</div>
            <div><strong>ISCO (Orbit Min):</strong> {isco} u (3.0 Rs)</div>
            <div><strong>Shadow Radius:</strong> {shadow} u (2.6 Rs)</div>
            <div style={{ color: '#10b981', marginTop: 4 }}>
              ● 60 FPS Locked · GPU Vertex Advection
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
