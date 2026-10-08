import { useState, useEffect, useMemo, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, PerformanceMonitor } from '@react-three/drei'
import { Pane } from 'tweakpane'
import { LAB_BENCHES } from '../../data/labBenches'
import { CausticsStage } from './CausticsStage'
import { TerrainStage } from './TerrainStage'
import { ShatterStage } from './ShatterStage'
import * as THREE from 'three'

export function LabView() {
  const [bench, setBench] = useState('caustics')
  const [level, setLevel] = useState(3)
  const [fps, setFps] = useState(60)
  const paneContainerRef = useRef(null)
  const paneRef = useRef(null)
  const controlsRef = useRef(null)

  // Track Hash changes
  useEffect(() => {
    const handleHash = () => {
      let hash = window.location.hash
      if (!hash.startsWith('#/lab/')) {
        return
      }

      const queryIdx = hash.indexOf('?')
      const path = queryIdx >= 0 ? hash.substring(6, queryIdx) : hash.substring(6)
      const params = new URLSearchParams(queryIdx >= 0 ? hash.substring(queryIdx) : '')

      if (['terrain', 'caustics', 'shatter'].includes(path)) {
        setBench(path)
      } else {
        setBench('caustics')
      }

      const paramLevel = parseInt(params.get('level') || '3', 10)
      if ([1, 2, 3].includes(paramLevel)) {
        setLevel(paramLevel)
      } else {
        setLevel(3)
      }
    }

    window.addEventListener('hashchange', handleHash)
    handleHash()
    return () => window.removeEventListener('hashchange', handleHash)
  }, [])

  // Parameters for each bench
  const [causticsParams, setCausticsParams] = useState({
    scaleA: 2.3,
    scaleB: 3.7,
    speed: 0.32,
    sharpness: 18,
    intensity: 1.65,
    rgbOffset: 0.012,
    waterLevel: 1.05,
    layer: 0,
    rawField: false,
    showSeeds: false,
    freeze: false
  })

  const [terrainParams, setTerrainParams] = useState({
    count: 1500,
    amplitude: 4.2,
    seed: 42,
    wireframe: false,
    seeds: false,
    biomes: true,
    sea: true,
    sampling: 'poisson',
    smooth: false
  })

  const [shatterParams, setShatterParams] = useState({
    count: 180,
    seeds: false,
    freeze: false,
    slowMotion: false
  })

  // Dynamic Camera parameters per bench
  const cameraConfig = useMemo(() => {
    switch (bench) {
      case 'caustics':
        return { position: [12, 13, 16], target: [0, 0.4, 0], fov: 42, minDistance: 10, maxDistance: 35 }
      case 'terrain':
        return { position: [16, 15, 19], target: [0, 1, 0], fov: 42, minDistance: 12, maxDistance: 42 }
      case 'shatter':
        return { position: [4.1, 3, 6.3], target: [0, 1.05, 0], fov: 45, minDistance: 3, maxDistance: 13 }
      default:
        return { position: [12, 13, 16], target: [0, 0.4, 0], fov: 42, minDistance: 10, maxDistance: 35 }
    }
  }, [bench])

  // Tweakpane setup
  useEffect(() => {
    if (!paneContainerRef.current) return

    const p = new Pane({ container: paneContainerRef.current })
    paneRef.current = p

    if (bench === 'caustics') {
      p.addBinding(causticsParams, 'rawField', { label: 'Raw field' }).on('change', (ev) =>
        setCausticsParams(s => ({ ...s, rawField: ev.value }))
      )
      p.addBinding(causticsParams, 'showSeeds', { label: 'Show seeds' }).on('change', (ev) =>
        setCausticsParams(s => ({ ...s, showSeeds: ev.value }))
      )
      p.addBinding(causticsParams, 'freeze', { label: 'Freeze time' }).on('change', (ev) =>
        setCausticsParams(s => ({ ...s, freeze: ev.value }))
      )

      if (level === 3) {
        p.addBinding(causticsParams, 'scaleA', { min: 0.5, max: 6, label: 'Scale A' }).on('change', ev => setCausticsParams(s => ({ ...s, scaleA: ev.value })))
        p.addBinding(causticsParams, 'scaleB', { min: 0.5, max: 6, label: 'Scale B' }).on('change', ev => setCausticsParams(s => ({ ...s, scaleB: ev.value })))
        p.addBinding(causticsParams, 'speed', { min: 0, max: 2, label: 'Speed' }).on('change', ev => setCausticsParams(s => ({ ...s, speed: ev.value })))
        p.addBinding(causticsParams, 'sharpness', { min: 1, max: 50, label: 'Sharpness' }).on('change', ev => setCausticsParams(s => ({ ...s, sharpness: ev.value })))
        p.addBinding(causticsParams, 'intensity', { min: 0, max: 5, label: 'Intensity' }).on('change', ev => setCausticsParams(s => ({ ...s, intensity: ev.value })))
        p.addBinding(causticsParams, 'rgbOffset', { min: 0, max: 0.05, label: 'RGB Offset' }).on('change', ev => setCausticsParams(s => ({ ...s, rgbOffset: ev.value })))
        p.addBinding(causticsParams, 'waterLevel', { min: 0.5, max: 2, label: 'Water Level' }).on('change', ev => setCausticsParams(s => ({ ...s, waterLevel: ev.value })))
        p.addBinding(causticsParams, 'layer', { options: { Combined: 0, 'Layer A': 1, 'Layer B': 2 }, label: 'Layer' }).on('change', ev => setCausticsParams(s => ({ ...s, layer: ev.value })))
      }
    } else if (bench === 'terrain') {
      p.addBinding(terrainParams, 'count', {
        label: 'seed count ≈',
        min: level === 1 ? 2000 : 200,
        max: level === 1 ? 40000 : 4000,
        step: 100
      }).on('change', ev => setTerrainParams(s => ({ ...s, count: ev.value })))

      p.addBinding(terrainParams, 'amplitude', { min: 1, max: 7, step: 0.1, label: 'Amplitude' }).on('change', ev => setTerrainParams(s => ({ ...s, amplitude: ev.value })))

      p.addButton({ title: 'Regenerate seed' }).on('click', () => {
        setTerrainParams(s => ({ ...s, seed: s.seed + 1 }))
      })

      const folder = p.addFolder({ title: 'Reveal' })
      folder.addBinding(terrainParams, 'smooth', { label: 'smooth shading' }).on('change', ev => setTerrainParams(s => ({ ...s, smooth: ev.value })))

      if (level === 3) {
        folder.addBinding(terrainParams, 'sampling', { options: { poisson: 'poisson', random: 'random' }, label: 'sampling' }).on('change', ev => setTerrainParams(s => ({ ...s, sampling: ev.value })))
      }
      folder.addBinding(terrainParams, 'wireframe', { label: 'wireframe' }).on('change', ev => setTerrainParams(s => ({ ...s, wireframe: ev.value })))
      folder.addBinding(terrainParams, 'seeds', { label: level === 1 ? 'seeds ≤2000' : 'seeds' }).on('change', ev => setTerrainParams(s => ({ ...s, seeds: ev.value })))
      folder.addBinding(terrainParams, 'biomes', { label: 'biome regions' }).on('change', ev => setTerrainParams(s => ({ ...s, biomes: ev.value })))
      folder.addBinding(terrainParams, 'sea', { label: 'sea level' }).on('change', ev => setTerrainParams(s => ({ ...s, sea: ev.value })))
    } else if (bench === 'shatter') {
      p.addBinding(shatterParams, 'count', { min: 50, max: 400, step: 10, label: 'Cells count' }).on('change', ev => setShatterParams(s => ({ ...s, count: ev.value })))
      p.addBinding(shatterParams, 'freeze', { label: 'Freeze' }).on('change', ev => setShatterParams(s => ({ ...s, freeze: ev.value })))
      p.addBinding(shatterParams, 'slowMotion', { label: 'Slow motion' }).on('change', ev => setShatterParams(s => ({ ...s, slowMotion: ev.value })))
      p.addBinding(shatterParams, 'seeds', { label: 'Show seeds' }).on('change', ev => setShatterParams(s => ({ ...s, seeds: ev.value })))
    }

    return () => p.dispose()
  }, [bench, level])

  const renderStage = () => {
    switch (bench) {
      case 'caustics': return <CausticsStage level={level} params={causticsParams} />
      case 'terrain': return <TerrainStage level={level} params={terrainParams} />
      case 'shatter': return <ShatterStage level={level} params={shatterParams} />
      default: return null
    }
  }

  const currentBenchData = LAB_BENCHES[bench]
  const levelData = currentBenchData ? currentBenchData[level - 1] : null

  return (
    <main className="lab-shell">
      <aside className="lab-sidebar">
        <a href="#/" className="lab-brand">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#8fd3ff', marginRight: 10 }}>
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>
            <path d="M2 12h20"/>
          </svg>
          <div className="lab-brand-title">Wawa Sensei</div>
        </a>

        <div className="lab-eyebrow">The Lab</div>
        <nav>
          {['terrain', 'caustics', 'shatter'].map(b => (
            <a
              key={b}
              href={`#/lab/${b}?level=${level}`}
              className={bench === b ? 'active' : ''}
              onClick={() => setBench(b)}
            >
              <span className="icon" style={{ background: bench === b ? '#8fd3ff' : '#516d84', width: 14, height: 14, display: 'inline-block', borderRadius: 4, marginRight: 8, verticalAlign: 'middle' }}></span>
              {b.charAt(0).toUpperCase() + b.slice(1)}
              <span style={{ marginLeft: 'auto' }}>{(LAB_BENCHES[b] || []).length}</span>
            </a>
          ))}
        </nav>

        <div className="lab-eyebrow">Technique Level</div>
        <div className="lab-level-label" style={{ marginTop: 12 }}>
          Algorithm complexity
          <small>{level} / 3</small>
        </div>

        <input
          type="range"
          min="1"
          max="3"
          step="1"
          value={level}
          className="lab-range"
          onChange={(e) => {
            const nl = parseInt(e.target.value, 10);
            window.location.hash = `#/lab/${bench}?level=${nl}`
          }}
        />
        <div className="lab-ticks">
          <span>1</span>
          <span>2</span>
          <span>3</span>
        </div>

        {levelData && (
          <div className="lab-card">
            <div className="level-number">Level 0{level}</div>
            <h1>{levelData.title}</h1>
            <p>{levelData.technique}</p>
            <div className="sees">
              <strong>Sees:</strong> {levelData.sees}
            </div>
          </div>
        )}

        <div className="lab-pane" ref={paneContainerRef}></div>

        <a href="https://github.com/wawasensei/aquarium" target="_blank" rel="noreferrer" className="lab-source">
          <svg viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.379.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.42 22 12c0-5.523-4.477-10-10-10z"/></svg>
          View source on GitHub
        </a>
      </aside>

      <div className="lab-stage">
        <div className="lab-stage-label">
          <div className="lab-eyebrow">The Lab · You can't prompt what you can't name</div>
          <strong>{bench.charAt(0).toUpperCase() + bench.slice(1)}</strong>
        </div>

        <Canvas
          shadows
          camera={{ position: cameraConfig.position, fov: cameraConfig.fov }}
        >
          <color attach="background" args={['#041e34']} />
          <fogExp2 attach="fog" args={['#041e34', 0.017]} />
          {renderStage()}
          <OrbitControls
            ref={controlsRef}
            makeDefault
            minDistance={cameraConfig.minDistance}
            maxDistance={cameraConfig.maxDistance}
            target={cameraConfig.target}
            maxPolarAngle={Math.PI * 0.48}
            enableDamping
          />
          <PerformanceMonitor onChange={({ fps }) => setFps(Math.round(fps))} />
        </Canvas>

        <div className="lab-fps">
          {fps} FPS
        </div>

        <div className="lab-stage-caption">
          Drag to explore · Scroll to move closer
        </div>

        <a href="#/fisherman" className="lab-back" style={{ fontWeight: 600, background: 'rgba(255, 166, 59, 0.2)', borderColor: 'rgba(255, 166, 59, 0.5)', color: '#ffb950' }}>
          ← 🏮 Night Fisherman
        </a>
        <a href="#/aquarium" className="lab-back" style={{ left: 215 }}>
          🐠 Aquarium Lab
        </a>
      </div>
    </main>
  )
}
