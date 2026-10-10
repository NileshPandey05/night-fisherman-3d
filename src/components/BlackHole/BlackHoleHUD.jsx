import React, { useState } from 'react'

export function BlackHoleHUD({
  mass,
  setMass,
  rotationSpeed,
  setRotationSpeed,
  dopplerGain,
  setDopplerGain,
  temperatureScale,
  setTemperatureScale,
  qualityPreset,
  setQualityPreset,
  bloomEnabled,
  setBloomEnabled,
  isPaused,
  setIsPaused,
  cameraPreset,
  setCameraPreset,
  raysEnabled = true,
  setRaysEnabled,
  rayPattern = 'all',
  setRayPattern,
  rayDensity = 'medium',
  setRayDensity,
  rayColorPreset = 'cyan',
  setRayColorPreset,
  raySpeed = 1.0,
  setRaySpeed
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
        background: 'rgba(8, 12, 20, 0.90)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 166, 59, 0.22)',
        borderRadius: 12,
        padding: 16,
        color: '#f1f5f9',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: 12,
        boxShadow: '0 12px 36px rgba(0, 0, 0, 0.75)'
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#ff9828', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>🕳️</span>
            <span>Relativistic Lensing Studio</span>
          </div>
          <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
            Kip Thorne Null-Geodesic Spacetime Raymarcher
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
          {/* Quality Presets */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#cbd5e1', marginBottom: 6 }}>
              Raymarch Quality ({qualityPreset.toUpperCase()}):
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
              {[
                { id: 'low', label: '26 Steps' },
                { id: 'medium', label: '38 Steps' },
                { id: 'high', label: '56 Steps' },
                { id: 'ultra', label: '72 Steps' }
              ].map(q => (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setQualityPreset(q.id)}
                  style={{
                    padding: '5px 0',
                    border: 'none',
                    borderRadius: 4,
                    fontSize: 10,
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: qualityPreset === q.id ? '#ff9828' : 'rgba(255, 255, 255, 0.06)',
                    color: qualityPreset === q.id ? '#0f172a' : '#94a3b8'
                  }}
                >
                  {q.id.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Camera View Presets */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#cbd5e1', marginBottom: 6 }}>
              Camera Perspectives:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 4 }}>
              {[
                { id: 'edge_on', label: '🎬 Edge-On (Target)' },
                { id: 'slight_tilt', label: '📐 78° Tilt' },
                { id: 'oblique', label: '🔭 45° Oblique' },
                { id: 'polar', label: '👁️ Top Polar' }
              ].map(cam => (
                <button
                  key={cam.id}
                  type="button"
                  onClick={() => setCameraPreset(cam.id)}
                  style={{
                    padding: '6px 8px',
                    border: 'none',
                    borderRadius: 4,
                    fontSize: 10,
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: cameraPreset === cam.id ? 'rgba(255, 152, 40, 0.25)' : 'rgba(255, 255, 255, 0.06)',
                    color: cameraPreset === cam.id ? '#ffb950' : '#94a3b8',
                    textAlign: 'left'
                  }}
                >
                  {cam.label}
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
                min="0.6"
                max="1.8"
                step="0.05"
                value={mass}
                onChange={e => setMass(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: '#ff9828' }}
              />
            </div>

            {/* Rotation Speed */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ color: '#94a3b8' }}>Keplerian Rotation:</span>
                <span style={{ fontWeight: 600, color: '#f1f5f9' }}>{rotationSpeed.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="2.5"
                step="0.1"
                value={rotationSpeed}
                onChange={e => setRotationSpeed(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: '#ff9828' }}
              />
            </div>

            {/* Relativistic Doppler Beaming */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ color: '#94a3b8' }}>Doppler Beaming (δ⁴):</span>
                <span style={{ fontWeight: 600, color: '#f1f5f9' }}>{dopplerGain.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.5"
                step="0.05"
                value={dopplerGain}
                onChange={e => setDopplerGain(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: '#ff9828' }}
              />
            </div>

            {/* Temperature / Emission Scale */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ color: '#94a3b8' }}>Thermal Emission (T):</span>
                <span style={{ fontWeight: 600, color: '#f1f5f9' }}>{temperatureScale.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.05"
                value={temperatureScale}
                onChange={e => setTemperatureScale(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: '#ff9828' }}
              />
            </div>
          </div>

          {/* Relativistic Light Ray Tracers Section */}
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.65)',
              borderRadius: 8,
              padding: 10,
              border: '1px solid rgba(56, 189, 248, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 600, fontSize: 11, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: 5 }}>
                <span>⚡</span>
                <span>Light Rays & Bending (Geodesics)</span>
              </div>
              <button
                type="button"
                onClick={() => setRaysEnabled && setRaysEnabled(!raysEnabled)}
                style={{
                  padding: '3px 8px',
                  borderRadius: 4,
                  fontSize: 10,
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  background: raysEnabled ? '#0284c7' : 'rgba(255, 255, 255, 0.08)',
                  color: raysEnabled ? '#ffffff' : '#94a3b8'
                }}
              >
                {raysEnabled ? 'ON' : 'OFF'}
              </button>
            </div>

            {raysEnabled && (
              <>
                {/* Ray Pattern Selector */}
                <div>
                  <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 4 }}>
                    Phenomenon Pattern:
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 3 }}>
                    {[
                      { id: 'all', label: 'All' },
                      { id: 'wavefront', label: 'Wavefront' },
                      { id: 'arches', label: 'Arches' },
                      { id: 'photon_ring', label: 'P-Ring' }
                    ].map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setRayPattern && setRayPattern(p.id)}
                        style={{
                          padding: '4px 0',
                          borderRadius: 3,
                          fontSize: 9,
                          fontWeight: 600,
                          border: 'none',
                          cursor: 'pointer',
                          background: rayPattern === p.id ? '#38bdf8' : 'rgba(255, 255, 255, 0.06)',
                          color: rayPattern === p.id ? '#0f172a' : '#cbd5e1'
                        }}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color Scheme */}
                <div>
                  <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 4 }}>
                    Laser Beam Palette:
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 3 }}>
                    {[
                      { id: 'cyan', label: 'Cyan Laser' },
                      { id: 'gold', label: 'Solar Gold' },
                      { id: 'violet', label: 'Violet' },
                      { id: 'spectral', label: 'Spectral' }
                    ].map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setRayColorPreset && setRayColorPreset(c.id)}
                        style={{
                          padding: '4px 0',
                          borderRadius: 3,
                          fontSize: 9,
                          fontWeight: 600,
                          border: 'none',
                          cursor: 'pointer',
                          background: rayColorPreset === c.id ? 'rgba(56, 189, 248, 0.35)' : 'rgba(255, 255, 255, 0.06)',
                          color: rayColorPreset === c.id ? '#38bdf8' : '#94a3b8',
                          borderWidth: 1,
                          borderStyle: 'solid',
                          borderColor: rayColorPreset === c.id ? '#38bdf8' : 'transparent'
                        }}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Ray Speed Slider */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                    <span style={{ fontSize: 10, color: '#94a3b8' }}>Photon Speed:</span>
                    <span style={{ fontSize: 10, fontWeight: 600, color: '#f1f5f9' }}>{raySpeed.toFixed(2)}c</span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="2.5"
                    step="0.1"
                    value={raySpeed}
                    onChange={e => setRaySpeed && setRaySpeed(parseFloat(e.target.value))}
                    style={{ width: '100%', accentColor: '#38bdf8' }}
                  />
                </div>
              </>
            )}
          </div>

          {/* Action Toggles */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, paddingTop: 4 }}>
            <button
              type="button"
              onClick={() => setIsPaused(!isPaused)}
              style={{
                padding: '6px',
                border: 'none',
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                background: isPaused ? 'rgba(239, 68, 68, 0.25)' : 'rgba(34, 197, 94, 0.2)',
                color: isPaused ? '#fca5a5' : '#86efac',
                borderWidth: 1,
                borderStyle: 'solid',
                borderColor: isPaused ? 'rgba(239, 68, 68, 0.5)' : 'rgba(34, 197, 94, 0.4)'
              }}
            >
              {isPaused ? '▶ Resume' : '⏸ Pause'}
            </button>

            <button
              type="button"
              onClick={() => setBloomEnabled(!bloomEnabled)}
              style={{
                padding: '6px',
                border: 'none',
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                background: bloomEnabled ? 'rgba(255, 152, 40, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                color: bloomEnabled ? '#ffb950' : '#64748b',
                borderWidth: 1,
                borderStyle: 'solid',
                borderColor: bloomEnabled ? 'rgba(255, 152, 40, 0.4)' : 'transparent'
              }}
            >
              ✨ Bloom Glow
            </button>
          </div>

          {/* Physical Metric Telemetry */}
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.55)',
              borderRadius: 6,
              padding: 8,
              fontSize: 10,
              fontFamily: 'monospace',
              color: '#94a3b8',
              lineHeight: 1.5,
              border: '1px solid rgba(255, 255, 255, 0.08)'
            }}
          >
            <div><strong>Event Horizon (Rs):</strong> {rs} u</div>
            <div><strong>ISCO Inner Rim:</strong> {isco} u (3.0 Rs)</div>
            <div><strong>Lensed Shadow (bcrit):</strong> {shadow} u (2.6 Rs)</div>
            <div style={{ color: '#ff9828', marginTop: 4 }}>
              ● Geodesic Upper/Lower Arches Active
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
