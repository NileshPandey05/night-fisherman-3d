import { ShorelineTerrain } from './ShorelineTerrain'
import { ShorelineWater } from './ShorelineWater'
import { SprayParticles } from './SprayParticles'

export function ShorelineSimulation({ config }) {
  return (
    <group>
      {/* Dynamic Bathymetry Beach Sand Terrain */}
      <ShorelineTerrain
        slope={config.slope}
        waveHeight={config.waveHeight}
        waveSpeed={config.waveSpeed}
        swashRunup={config.swashRunup}
        erosionRate={config.erosionRate}
        depositionRate={config.depositionRate}
        causticIntensity={config.causticIntensity}
        causticScale={config.causticScale}
        causticSpeed={config.causticSpeed}
        sandDryColor={config.sandDryColor}
        sandMidColor={config.sandMidColor}
        sandWetColor={config.sandWetColor}
        sandDeepWetColor={config.sandDeepWetColor}
        causticColor={config.causticColor}
        debugMode={config.debugMode}
        planeSize={[32, 32]}
        resolution={180}
      />

      {/* Shoaling & Breaking Water Surface */}
      <ShorelineWater
        slope={config.slope}
        waveHeight={config.waveHeight}
        waveSpeed={config.waveSpeed}
        breakingThreshold={config.breakingThreshold}
        swashRunup={config.swashRunup}
        foamIntensity={config.foamIntensity}
        foamDecay={config.foamDecay}
        waterDeepColor={config.waterDeepColor}
        waterMidColor={config.waterMidColor}
        waterShallowColor={config.waterShallowColor}
        foamColor={config.foamColor}
        debugMode={config.debugMode}
        planeSize={[32, 32]}
        resolution={180}
      />

      {/* Breaking Wave Crest Spray Particles */}
      {config.sprayEnabled && (
        <SprayParticles
          count={config.sprayCount}
          waveSpeed={config.waveSpeed}
          waveHeight={config.waveHeight}
          sprayGravity={config.sprayGravity}
          sprayLifetime={config.sprayLifetime}
          sprayRate={config.sprayRate}
          sprayColor={config.sprayColor || '#EAFDFC'}
          slope={config.slope}
        />
      )}
    </group>
  )
}
