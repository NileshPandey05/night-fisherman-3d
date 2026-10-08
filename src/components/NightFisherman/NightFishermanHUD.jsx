import { useState } from 'react'

export function NightFishermanHUD({
  motionMode = 'milling',
  millingDirection = 1,
  bloomEnabled = true,
  causticsEnabled = true,
  onToggleMotionMode,
  onFlipDirection,
  onToggleBloom,
  onToggleCaustics,
  onTriggerAttack,
  onTriggerLeap
}) {
  const [attacking, setAttacking] = useState(false)

  const handleAttack = () => {
    setAttacking(true)
    if (onTriggerAttack) onTriggerAttack()
    setTimeout(() => setAttacking(false), 4500)
  }

  return (
    <div style={{
      position: 'absolute',
      bottom: 24,
      left: 24,
      zIndex: 900,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      maxWidth: 460,
      pointerEvents: 'none'
    }}>
      {/* Narrative Glassmorphism Card */}
      <div style={{
        background: 'rgba(3, 10, 22, 0.88)',
        backdropFilter: 'blur(18px)',
        border: '1px solid rgba(255, 170, 56, 0.32)',
        borderRadius: 16,
        padding: '18px 20px',
        color: '#e2e8f0',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        boxShadow: '0 16px 40px rgba(0, 0, 0, 0.65)',
        pointerEvents: 'auto'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: '#ffa63b',
            background: 'rgba(255, 166, 59, 0.16)',
            padding: '3px 9px',
            borderRadius: 6
          }}>
            🏮 Moonlit Ocean Diorama
          </span>
          <span style={{ fontSize: 12, color: '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>
            1,000 Fish · Bloom Active
          </span>
        </div>

        <h2 style={{ fontSize: 18, fontWeight: 700, margin: '4px 0 6px', color: '#f8fafc' }}>
          Night Fisherman & Silver Swarm
        </h2>
        <p style={{ fontSize: 13, lineHeight: 1.45, color: '#94a3b8', margin: 0 }}>
          Volumetric light shafts penetrate translucent water as 1,000 silver baitfish swim in biological unison. 
          <span style={{ color: '#67e8f9' }}> Click anywhere on the water to cast your line!</span>
        </p>

        {/* Swarm Behavior Modes */}
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
            Biological Swarm Dynamics
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, background: 'rgba(255,255,255,0.05)', padding: 4, borderRadius: 10 }}>
            <button
              type="button"
              onClick={() => onToggleMotionMode && onToggleMotionMode('milling')}
              style={{
                padding: '7px 10px',
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 7,
                border: 'none',
                background: motionMode === 'milling' ? '#ffa63b' : 'transparent',
                color: motionMode === 'milling' ? '#181005' : '#cbd5e1',
                cursor: 'pointer',
                transition: 'all 0.18s ease'
              }}
            >
              🌀 Milling Vortex
            </button>
            <button
              type="button"
              onClick={() => onToggleMotionMode && onToggleMotionMode('fountain')}
              style={{
                padding: '7px 10px',
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 7,
                border: 'none',
                background: motionMode === 'fountain' ? '#38bdf8' : 'transparent',
                color: motionMode === 'fountain' ? '#041624' : '#cbd5e1',
                cursor: 'pointer',
                transition: 'all 0.18s ease'
              }}
            >
              ⛲ Fountain Plume
            </button>
            <button
              type="button"
              onClick={() => onToggleMotionMode && onToggleMotionMode('flash')}
              style={{
                padding: '7px 10px',
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 7,
                border: 'none',
                background: motionMode === 'flash' ? '#f43f5e' : 'transparent',
                color: motionMode === 'flash' ? '#ffffff' : '#cbd5e1',
                cursor: 'pointer',
                transition: 'all 0.18s ease'
              }}
            >
              ⚡ Flash Expansion
            </button>
            <button
              type="button"
              onClick={() => onToggleMotionMode && onToggleMotionMode('flocking')}
              style={{
                padding: '7px 10px',
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 7,
                border: 'none',
                background: motionMode === 'flocking' ? '#10b981' : 'transparent',
                color: motionMode === 'flocking' ? '#021810' : '#cbd5e1',
                cursor: 'pointer',
                transition: 'all 0.18s ease'
              }}
            >
              🐟 Free Flocking
            </button>
          </div>
        </div>

        {/* Action Buttons & Bloom Toggle */}
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          {motionMode === 'milling' && (
            <button
              type="button"
              onClick={onFlipDirection}
              style={{
                padding: '8px 12px',
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 8,
                border: '1px solid rgba(255, 170, 56, 0.4)',
                background: 'rgba(255, 170, 56, 0.15)',
                color: '#ffa63b',
                cursor: 'pointer'
              }}
              title="Flip vortex rotation direction"
            >
              🔄 Flip ({millingDirection > 0 ? 'CCW' : 'CW'})
            </button>
          )}

          <button
            type="button"
            onClick={handleAttack}
            disabled={attacking}
            style={{
              flex: 1,
              padding: '8px 12px',
              fontSize: 12,
              fontWeight: 600,
              borderRadius: 8,
              border: 'none',
              background: attacking ? '#ef4444' : 'rgba(239, 68, 68, 0.25)',
              color: attacking ? '#ffffff' : '#fca5a5',
              borderWidth: '1px',
              borderStyle: 'solid',
              borderColor: attacking ? '#ef4444' : 'rgba(239, 68, 68, 0.45)',
              cursor: attacking ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6
            }}
          >
            {attacking ? '⚡ Darting...' : '🦈 Predator Strike'}
          </button>

          <button
            type="button"
            onClick={onToggleBloom}
            style={{
              padding: '8px 10px',
              fontSize: 12,
              fontWeight: 600,
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.18)',
              background: bloomEnabled ? 'rgba(253, 224, 71, 0.2)' : 'rgba(255, 255, 255, 0.05)',
              color: bloomEnabled ? '#fde047' : '#94a3b8',
              cursor: 'pointer'
            }}
            title="Toggle Post-processing Bloom Glow"
          >
            ✨ Bloom
          </button>

          <button
            type="button"
            onClick={onToggleCaustics}
            style={{
              padding: '8px 10px',
              fontSize: 12,
              fontWeight: 600,
              borderRadius: 8,
              border: '1px solid rgba(56, 189, 248, 0.45)',
              background: causticsEnabled ? 'rgba(56, 189, 248, 0.22)' : 'rgba(255, 255, 255, 0.05)',
              color: causticsEnabled ? '#38bdf8' : '#94a3b8',
              cursor: 'pointer'
            }}
            title="Toggle Wawa Sensei Level 3 Chromatic Caustics"
          >
            🌊 L3 Caustics: {causticsEnabled ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {/* Physics Badges */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 6,
        fontSize: 11,
        color: '#64748b'
      }}>
        <span style={{ background: 'rgba(10, 20, 36, 0.88)', padding: '3px 8px', borderRadius: 4, border: '1px solid rgba(56, 189, 248, 0.35)', color: '#38bdf8', fontWeight: 600 }}>
          🌊 Wawa Sensei Level 3 Chromatic Caustics
        </span>
        <span style={{ background: 'rgba(10, 20, 36, 0.88)', padding: '3px 8px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.06)' }}>
          ✨ UnrealBloom Post-Processing
        </span>
        <span style={{ background: 'rgba(10, 20, 36, 0.88)', padding: '3px 8px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.06)' }}>
          🔦 Underwater God Ray Shafts
        </span>
        <span style={{ background: 'rgba(10, 20, 36, 0.88)', padding: '3px 8px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.06)' }}>
          🛶 Distant Horizon Lanterns
        </span>
        <span style={{ background: 'rgba(10, 20, 36, 0.88)', padding: '3px 8px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.06)' }}>
          🎣 Interactive Click-to-Cast Lure
        </span>
      </div>
    </div>
  )
}
