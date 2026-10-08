import * as THREE from 'three'
import { waterVertexShader, waterFragmentShader } from '../shaders/shorelineShaders'

export class WaterMaterial extends THREE.ShaderMaterial {
  constructor(parameters = {}) {
    const uniforms = {
      uTime: { value: 0.0 },
      uSlope: { value: parameters.slope ?? 0.18 },
      uWaveHeight: { value: parameters.waveHeight ?? 0.65 },
      uWaveSpeed: { value: parameters.waveSpeed ?? 0.85 },
      uBreakingThreshold: { value: parameters.breakingThreshold ?? 0.68 },
      uSwashRunup: { value: parameters.swashRunup ?? 1.2 },
      uFoamIntensity: { value: parameters.foamIntensity ?? 1.2 },
      uFoamDecay: { value: parameters.foamDecay ?? 0.4 },
      uWaterDeepColor: { value: new THREE.Color(parameters.waterDeepColor ?? '#0B5263') },
      uWaterMidColor: { value: new THREE.Color(parameters.waterMidColor ?? '#087F8C') },
      uWaterShallowColor: { value: new THREE.Color(parameters.waterShallowColor ?? '#19A9A0') },
      uFoamColor: { value: new THREE.Color(parameters.foamColor ?? '#DDFBFA') },
      uSunPosition: { value: new THREE.Vector3(12, 18, 10) },
      uDebugMode: { value: parameters.debugMode ?? 0 },
    }

    super({
      vertexShader: waterVertexShader,
      fragmentShader: waterFragmentShader,
      uniforms,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  }

  get time() { return this.uniforms.uTime.value }
  set time(v) { this.uniforms.uTime.value = v }
  get slope() { return this.uniforms.uSlope.value }
  set slope(v) { this.uniforms.uSlope.value = v }
  get waveHeight() { return this.uniforms.uWaveHeight.value }
  set waveHeight(v) { this.uniforms.uWaveHeight.value = v }
  get waveSpeed() { return this.uniforms.uWaveSpeed.value }
  set waveSpeed(v) { this.uniforms.uWaveSpeed.value = v }
  get breakingThreshold() { return this.uniforms.uBreakingThreshold.value }
  set breakingThreshold(v) { this.uniforms.uBreakingThreshold.value = v }
  get swashRunup() { return this.uniforms.uSwashRunup.value }
  set swashRunup(v) { this.uniforms.uSwashRunup.value = v }
  get foamIntensity() { return this.uniforms.uFoamIntensity.value }
  set foamIntensity(v) { this.uniforms.uFoamIntensity.value = v }
  get foamDecay() { return this.uniforms.uFoamDecay.value }
  set foamDecay(v) { this.uniforms.uFoamDecay.value = v }
  get waterDeepColor() { return this.uniforms.uWaterDeepColor.value }
  set waterDeepColor(v) { this.uniforms.uWaterDeepColor.value.set(v) }
  get waterMidColor() { return this.uniforms.uWaterMidColor.value }
  set waterMidColor(v) { this.uniforms.uWaterMidColor.value.set(v) }
  get waterShallowColor() { return this.uniforms.uWaterShallowColor.value }
  set waterShallowColor(v) { this.uniforms.uWaterShallowColor.value.set(v) }
  get foamColor() { return this.uniforms.uFoamColor.value }
  set foamColor(v) { this.uniforms.uFoamColor.value.set(v) }
  get debugMode() { return this.uniforms.uDebugMode.value }
  set debugMode(v) { this.uniforms.uDebugMode.value = v }
  get sunPosition() { return this.uniforms.uSunPosition.value }
  set sunPosition(v) { this.uniforms.uSunPosition.value.copy(v) }
}
