export function UIControls({ config, setConfig, sceneMode }) {
  const handleChange = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }))
  }

  const parseValue = (type, val) => {
    if (type === 'number') return parseFloat(val)
    if (type === 'int') return parseInt(val, 10)
    if (type === 'bool') return val === true || val === 'true'
    return val
  }

  const applyPreset = (presetName) => {
    if (presetName === 'calm') {
      setConfig(prev => ({
        ...prev,
        waveHeight: 0.4,
        waveSpeed: 0.65,
        breakingThreshold: 0.75,
        swashRunup: 0.9,
        foamIntensity: 0.8,
        sprayCount: 4000,
        sprayRate: 0.6,
        causticIntensity: 2.0,
      }))
    } else if (presetName === 'energetic') {
      setConfig(prev => ({
        ...prev,
        waveHeight: 0.75,
        waveSpeed: 0.95,
        breakingThreshold: 0.65,
        swashRunup: 1.4,
        foamIntensity: 1.4,
        sprayCount: 8000,
        sprayRate: 1.2,
        causticIntensity: 1.8,
      }))
    } else if (presetName === 'storm') {
      setConfig(prev => ({
        ...prev,
        waveHeight: 1.1,
        waveSpeed: 1.25,
        breakingThreshold: 0.55,
        swashRunup: 1.8,
        foamIntensity: 2.0,
        sprayCount: 14000,
        sprayRate: 1.8,
        causticIntensity: 1.2,
      }))
    }
  }

  return (
    <div style={{
      position: 'absolute',
      top: 16,
      right: 16,
      width: 320,
      background: 'rgba(10, 20, 32, 0.88)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255, 255, 255, 0.12)',
      borderRadius: 12,
      padding: '18px 20px',
      color: '#e2e8f0',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: 13,
      boxShadow: '0 12px 30px rgba(0,0,0,0.6)',
      zIndex: 1000,
      maxHeight: 'calc(100vh - 32px)',
      overflowY: 'auto'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <h3 style={{ margin: 0, fontSize: 15, color: '#fff', fontWeight: 600 }}>
          {sceneMode === 'aquarium' ? 'Aquarium Caustics Lab' : 'Shoreline & Caustics'}
        </h3>
        <span style={{ fontSize: 11, background: '#19A9A0', color: '#002b2b', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>
          {sceneMode === 'aquarium' ? `Level ${config.causticLevel ?? 3}` : 'GPU Physics'}
        </span>
      </div>

      {/* Aquarium Caustic Level Switcher */}
      {sceneMode === 'aquarium' && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#8DEBFF', marginBottom: 6, fontWeight: 700 }}>
            Caustics Fidelity Level
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[
              { level: 1, label: 'Lvl 1 (Voronoi)' },
              { level: 2, label: 'Lvl 2 (Warped)' },
              { level: 3, label: 'Lvl 3 (Delaunay)' },
            ].map(item => (
              <button
                key={item.level}
                type="button"
                onClick={() => handleChange('causticLevel', item.level)}
                style={{
                  flex: 1,
                  padding: '7px 4px',
                  fontSize: 11,
                  fontWeight: 600,
                  background: config.causticLevel === item.level ? '#19A9A0' : 'rgba(255,255,255,0.08)',
                  color: config.causticLevel === item.level ? '#002b2b' : '#d4f1f9',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 6,
                  cursor: 'pointer'
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Preset Quick-Buttons (Shoreline mode) */}
      {sceneMode === 'shoreline' && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {[
            { id: 'calm', label: 'Calm Beach' },
            { id: 'energetic', label: 'Active Swell' },
            { id: 'storm', label: 'Heavy Surf' },
          ].map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => applyPreset(p.id)}
              style={{
                flex: 1,
                padding: '6px 4px',
                fontSize: 11,
                fontWeight: 500,
                background: 'rgba(255,255,255,0.08)',
                color: '#d4f1f9',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 6,
                cursor: 'pointer'
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      {/* Wave Dynamics Section (Shoreline mode) */}
      {sceneMode === 'shoreline' && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 12, marginBottom: 12 }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#8DEBFF', marginBottom: 8, fontWeight: 700 }}>
            Wave Hydrodynamics
          </div>
          {[
            { key: 'waveHeight', label: 'Wave Height (Amplitude)', min: 0.1, max: 1.6, step: 0.05 },
            { key: 'waveSpeed', label: 'Wave Celerity (Speed)', min: 0.2, max: 2.0, step: 0.05 },
            { key: 'slope', label: 'Beach Bathymetry Slope', min: 0.08, max: 0.35, step: 0.01 },
            { key: 'breakingThreshold', label: 'Breaking Index (H/D)', min: 0.4, max: 1.0, step: 0.02 },
            { key: 'swashRunup', label: 'Swash Surge Run-Up', min: 0.4, max: 2.5, step: 0.1 },
          ].map(prop => (
            <div key={prop.key} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                <span style={{ color: '#cbd5e1' }}>{prop.label}</span>
                <span style={{ color: '#8DEBFF', fontWeight: 600 }}>{config[prop.key]}</span>
              </div>
              <input
                type="range"
                min={prop.min}
                max={prop.max}
                step={prop.step}
                value={config[prop.key]}
                onChange={(e) => handleChange(prop.key, parseValue('number', e.target.value))}
                style={{ width: '100%', accentColor: '#19A9A0', cursor: 'pointer' }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Foam & Spray Section (Shoreline mode) */}
      {sceneMode === 'shoreline' && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 12, marginBottom: 12 }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#DDFBFA', marginBottom: 8, fontWeight: 700 }}>
            Foam & GPU Spray
          </div>
          {[
            { key: 'foamIntensity', label: 'Foam Intensity', min: 0, max: 2.5, step: 0.1 },
            { key: 'foamDecay', label: 'Foam Persistence', min: 0.1, max: 1.0, step: 0.05 },
            { key: 'sprayRate', label: 'Spray Particle Opacity', min: 0, max: 2.0, step: 0.1 },
            { key: 'sprayGravity', label: 'Spray Gravity Falloff', min: 1.0, max: 8.0, step: 0.5 },
          ].map(prop => (
            <div key={prop.key} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                <span style={{ color: '#cbd5e1' }}>{prop.label}</span>
                <span style={{ color: '#DDFBFA', fontWeight: 600 }}>{config[prop.key]}</span>
              </div>
              <input
                type="range"
                min={prop.min}
                max={prop.max}
                step={prop.step}
                value={config[prop.key]}
                onChange={(e) => handleChange(prop.key, parseValue('number', e.target.value))}
                style={{ width: '100%', accentColor: '#DDFBFA', cursor: 'pointer' }}
              />
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ color: '#cbd5e1' }}>Enable Wave Spray Particles</span>
            <input
              type="checkbox"
              checked={config.sprayEnabled}
              onChange={(e) => handleChange('sprayEnabled', e.target.checked)}
              style={{ cursor: 'pointer', accentColor: '#19A9A0' }}
            />
          </div>
        </div>
      )}

      {/* Caustics Tuning Section (Shared) */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 12, marginBottom: 12 }}>
        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#BFFAFF', marginBottom: 8, fontWeight: 700 }}>
          Underwater Caustics
        </div>
        {[
          { key: 'causticIntensity', label: 'Caustics Brightness', min: 0, max: 4.0, step: 0.1 },
          { key: 'causticScale', label: 'Caustics Pattern Scale', min: 1.0, max: 10.0, step: 0.2 },
          { key: 'causticSpeed', label: 'Caustics Flow Speed', min: 0.1, max: 2.0, step: 0.05 },
          { key: 'sharpness', label: 'Edge Sharpness / Cusps', min: 1.0, max: 6.0, step: 0.2 },
          { key: 'dispersion', label: 'Chromatic Dispersion', min: 0.0, max: 0.04, step: 0.002 },
        ].map(prop => (
          <div key={prop.key} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
              <span style={{ color: '#cbd5e1' }}>{prop.label}</span>
              <span style={{ color: '#BFFAFF', fontWeight: 600 }}>{config[prop.key]}</span>
            </div>
            <input
              type="range"
              min={prop.min}
              max={prop.max}
              step={prop.step}
              value={config[prop.key]}
              onChange={(e) => handleChange(prop.key, parseValue('number', e.target.value))}
              style={{ width: '100%', accentColor: '#BFFAFF', cursor: 'pointer' }}
            />
          </div>
        ))}
      </div>

      {/* Colors Section */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 12, marginBottom: 14 }}>
        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#D8B27A', marginBottom: 8, fontWeight: 700 }}>
          Water & Environment Colors
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 3 }}>Deep Water</div>
            <input
              type="color"
              value={config.waterDeepColor}
              onChange={(e) => handleChange('waterDeepColor', e.target.value)}
              style={{ width: '100%', height: 26, cursor: 'pointer', borderRadius: 4, border: 'none' }}
            />
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 3 }}>Caustic Light</div>
            <input
              type="color"
              value={config.causticColor}
              onChange={(e) => handleChange('causticColor', e.target.value)}
              style={{ width: '100%', height: 26, cursor: 'pointer', borderRadius: 4, border: 'none' }}
            />
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 3 }}>Seabed Base</div>
            <input
              type="color"
              value={config.sandWetColor}
              onChange={(e) => handleChange('sandWetColor', e.target.value)}
              style={{ width: '100%', height: 26, cursor: 'pointer', borderRadius: 4, border: 'none' }}
            />
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 3 }}>Shallow Water</div>
            <input
              type="color"
              value={config.waterShallowColor}
              onChange={(e) => handleChange('waterShallowColor', e.target.value)}
              style={{ width: '100%', height: 26, cursor: 'pointer', borderRadius: 4, border: 'none' }}
            />
          </div>
        </div>
      </div>

      {/* Debug Modes 0 - 10 (Shoreline mode) */}
      {sceneMode === 'shoreline' && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 12 }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#f59e0b', marginBottom: 6, fontWeight: 700 }}>
            Simulation Debug Views
          </div>
          <select
            value={config.debugMode}
            onChange={(e) => handleChange('debugMode', parseValue('int', e.target.value))}
            style={{
              width: '100%',
              padding: '8px 10px',
              background: 'rgba(0,0,0,0.4)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 6,
              fontSize: 12,
              cursor: 'pointer'
            }}
          >
            <option value={0}>0 — Full Beauty Simulation</option>
            <option value={1}>1 — Water Surface Height</option>
            <option value={2}>2 — Water Depth Field</option>
            <option value={3}>3 — Flow Velocity Vector Field</option>
            <option value={4}>4 — Wave Energy / Shoaling Amplitude</option>
            <option value={5}>5 — Wave Breaking Mask</option>
            <option value={6}>6 — Sand Bathymetry Height</option>
            <option value={7}>7 — Sediment Distribution</option>
            <option value={8}>8 — Dynamic Foam Mask</option>
            <option value={9}>9 — Underwater Caustics Illumination</option>
            <option value={10}>10 — Shoreline Run-Up / Wetness Mask</option>
          </select>
        </div>
      )}
    </div>
  )
}
