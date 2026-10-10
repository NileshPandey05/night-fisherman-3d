import { useState, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { ShorelineScene } from './components/ShorelineScene'
import { AquariumScene } from './components/Aquarium'
import { PoolScene } from './components/PoolScene'
import { UIControls } from './components/UIControls'
import { LabView } from './components/Lab/LabView'
import { NightFishermanScene, NightFishermanHUD } from './components/NightFisherman'
import { BlackHoleScene, BlackHoleHUD } from './components/BlackHole'

export default function App() {
  const [isLab, setIsLab] = useState(window.location.hash.startsWith('#/lab/'))
  const [sceneMode, setSceneMode] = useState('night_fisherman')
  const [fishermanMotionMode, setFishermanMotionMode] = useState('milling')
  const [millingDirection, setMillingDirection] = useState(1)
  const [bloomEnabled, setBloomEnabled] = useState(true)
  const [causticsEnabled, setCausticsEnabled] = useState(true)
  const [isPredatorAttacking, setIsPredatorAttacking] = useState(false)

  // Black Hole Relativistic Simulation State
  const [bhMass, setBhMass] = useState(1.0)
  const [bhRotationSpeed, setBhRotationSpeed] = useState(1.0)
  const [bhDopplerGain, setBhDopplerGain] = useState(0.85)
  const [bhTemperatureScale, setBhTemperatureScale] = useState(1.15)
  const [bhQualityPreset, setBhQualityPreset] = useState('high')
  const [bhBloomEnabled, setBhBloomEnabled] = useState(true)
  const [bhIsPaused, setBhIsPaused] = useState(false)
  const [bhCameraPreset, setBhCameraPreset] = useState('edge_on')

  const handleTriggerAttack = () => {
    setIsPredatorAttacking(true)
    setTimeout(() => setIsPredatorAttacking(false), 4500)
  }

  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash
      setIsLab(hash.startsWith('#/lab/'))
      if (hash === '#/blackhole') {
        setSceneMode('blackhole')
      } else if (hash === '#/shoreline') {
        setSceneMode('shoreline')
      } else if (hash === '#/aquarium') {
        setSceneMode('aquarium')
      } else if (hash === '#/pool') {
        setSceneMode('pool')
      } else if (hash === '#/fisherman' || hash === '#/' || !hash) {
        setSceneMode('night_fisherman')
      }
    }
    window.addEventListener('hashchange', handleHash)
    handleHash()
    // If empty hash or root, default to Night Fisherman
    if (!window.location.hash || window.location.hash === '#' || window.location.hash === '#/') {
      window.location.hash = '#/fisherman'
    }
    return () => window.removeEventListener('hashchange', handleHash)
  }, [])

  const [config, setConfig] = useState({
    causticLevel: 3,
    causticIntensity: 2.2,
    causticScale: 4.2,
    causticSpeed: 0.75,
    sharpness: 3.5,
    dispersion: 0.015,
    causticColor: '#99e6ff',
    waveHeight: 0.65,
    waveSpeed: 0.85,
    slope: 0.18,
    breakingThreshold: 0.68,
    swashRunup: 1.2,
    foamIntensity: 1.2,
    foamDecay: 0.4,
    sprayEnabled: true,
    sprayCount: 8000,
    sprayRate: 1.0,
    sprayGravity: 3.5,
    sprayLifetime: 1.4,
    sprayColor: '#EAFDFC',
    erosionRate: 0.05,
    depositionRate: 0.05,
    waterDeepColor: '#051923',
    waterMidColor: '#087F8C',
    waterShallowColor: '#19A9A0',
    foamColor: '#DDFBFA',
    sandDryColor: '#D8B27A',
    sandMidColor: '#C69A62',
    sandWetColor: '#0c2d3d',
    sandDeepWetColor: '#071d28',
    scale: 4.5,
    speed: 0.65,
    intensity: 2.2,
    distortion: 0.45,
    edgeWidth: 0.08,
    glow: 0.35,
    color: '#8debff',
    baseColor: '#052238',
    debugMode: 0,
  })

  if (isLab) {
    return <LabView />
  }

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden', background: '#03101b' }}>
      <div style={{
        position: 'absolute',
        top: 16,
        left: 16,
        zIndex: 1000,
        display: 'flex',
        background: 'rgba(10, 20, 32, 0.88)',
        backdropFilter: 'blur(12px)',
        borderRadius: 8,
        padding: 4,
        border: '1px solid rgba(255,255,255,0.15)',
        gap: 4
      }}>
        <button
          type="button"
          onClick={() => {
            window.location.hash = '#/blackhole'
            setSceneMode('blackhole')
          }}
          style={{
            padding: '6px 12px',
            fontSize: 12,
            fontWeight: 600,
            borderRadius: 6,
            border: 'none',
            background: sceneMode === 'blackhole' ? '#ffb950' : 'transparent',
            color: sceneMode === 'blackhole' ? '#0f172a' : '#94a3b8',
            cursor: 'pointer'
          }}
        >
          🕳️ Black Hole
        </button>
        <button
          type="button"
          onClick={() => {
            window.location.hash = '#/fisherman'
            setSceneMode('night_fisherman')
          }}
          style={{
            padding: '6px 12px',
            fontSize: 12,
            fontWeight: 600,
            borderRadius: 6,
            border: 'none',
            background: sceneMode === 'night_fisherman' ? '#ffa63b' : 'transparent',
            color: sceneMode === 'night_fisherman' ? '#1e140a' : '#94a3b8',
            cursor: 'pointer'
          }}
        >
          🏮 Night Fisherman
        </button>
        <button
          type="button"
          onClick={() => {
            window.location.hash = '#/shoreline'
            setSceneMode('shoreline')
          }}
          style={{
            padding: '6px 12px',
            fontSize: 12,
            fontWeight: 600,
            borderRadius: 6,
            border: 'none',
            background: sceneMode === 'shoreline' ? '#19A9A0' : 'transparent',
            color: sceneMode === 'shoreline' ? '#002b2b' : '#94a3b8',
            cursor: 'pointer'
          }}
        >
          🌊 Shoreline & Caustics
        </button>
        <button
          type="button"
          onClick={() => {
            window.location.hash = '#/aquarium'
            setSceneMode('aquarium')
          }}
          style={{
            padding: '6px 12px',
            fontSize: 12,
            fontWeight: 600,
            borderRadius: 6,
            border: 'none',
            background: sceneMode === 'aquarium' ? '#19A9A0' : 'transparent',
            color: sceneMode === 'aquarium' ? '#002b2b' : '#94a3b8',
            cursor: 'pointer'
          }}
        >
          🐠 Aquarium Lab
        </button>
        <button
          type="button"
          onClick={() => {
            window.location.hash = '#/pool'
            setSceneMode('pool')
          }}
          style={{
            padding: '6px 12px',
            fontSize: 12,
            fontWeight: 600,
            borderRadius: 6,
            border: 'none',
            background: sceneMode === 'pool' ? '#19A9A0' : 'transparent',
            color: sceneMode === 'pool' ? '#002b2b' : '#94a3b8',
            cursor: 'pointer'
          }}
        >
          🏊 Pool Caustics
        </button>
        <button
          type="button"
          onClick={() => {
            window.location.hash = '#/lab/caustics?level=3'
          }}
          style={{
            padding: '6px 12px',
            fontSize: 12,
            fontWeight: 600,
            borderRadius: 6,
            border: 'none',
            background: '#8fd3ff',
            color: '#002b2b',
            cursor: 'pointer'
          }}
        >
          🔬 Go to The Lab
        </button>
      </div>

      <Canvas
        camera={{ position: [0, 4.5, 9.5], fov: 48 }}
        dpr={[1, 1.5]}
        shadows
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      >
        {sceneMode === 'aquarium' && <AquariumScene config={config} />}
        {sceneMode === 'shoreline' && <ShorelineScene config={config} />}
        {sceneMode === 'pool' && <PoolScene config={config} />}
        {sceneMode === 'night_fisherman' && (
          <NightFishermanScene
            motionMode={fishermanMotionMode}
            millingDirection={millingDirection}
            bloomEnabled={bloomEnabled}
            causticsEnabled={causticsEnabled}
            isAttacking={isPredatorAttacking}
          />
        )}
        {sceneMode === 'blackhole' && (
          <BlackHoleScene
            mass={bhMass}
            rotationSpeed={bhRotationSpeed}
            dopplerGain={bhDopplerGain}
            temperatureScale={bhTemperatureScale}
            qualityPreset={bhQualityPreset}
            bloomEnabled={bhBloomEnabled}
            isPaused={bhIsPaused}
            cameraPreset={bhCameraPreset}
          />
        )}
      </Canvas>

      {sceneMode === 'blackhole' ? (
        <BlackHoleHUD
          mass={bhMass}
          setMass={setBhMass}
          rotationSpeed={bhRotationSpeed}
          setRotationSpeed={setBhRotationSpeed}
          dopplerGain={bhDopplerGain}
          setDopplerGain={setBhDopplerGain}
          temperatureScale={bhTemperatureScale}
          setTemperatureScale={setBhTemperatureScale}
          qualityPreset={bhQualityPreset}
          setQualityPreset={setBhQualityPreset}
          bloomEnabled={bhBloomEnabled}
          setBloomEnabled={setBhBloomEnabled}
          isPaused={bhIsPaused}
          setIsPaused={setBhIsPaused}
          cameraPreset={bhCameraPreset}
          setCameraPreset={setBhCameraPreset}
        />
      ) : sceneMode === 'night_fisherman' ? (
        <NightFishermanHUD
          motionMode={fishermanMotionMode}
          millingDirection={millingDirection}
          bloomEnabled={bloomEnabled}
          causticsEnabled={causticsEnabled}
          onToggleMotionMode={setFishermanMotionMode}
          onFlipDirection={() => setMillingDirection((d) => -d)}
          onToggleBloom={() => setBloomEnabled((b) => !b)}
          onToggleCaustics={() => setCausticsEnabled((c) => !c)}
          onTriggerAttack={handleTriggerAttack}
        />
      ) : (
        <UIControls
          config={config}
          setConfig={setConfig}
          sceneMode={sceneMode}
          setSceneMode={setSceneMode}
        />
      )}


    </div>
  )
}

