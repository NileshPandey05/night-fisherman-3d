import * as THREE from 'three'
import { causticsVertexShader, causticsFragmentShader } from './shaders/causticsShaders'

export class CausticsMaterial extends THREE.ShaderMaterial {
  constructor(parameters = {}) {
    const uniforms = {
      uTime: { value: 0.0 },
      uScale: { value: parameters.scale ?? 5.0 },
      uSpeed: { value: parameters.speed ?? 0.6 },
      uIntensity: { value: parameters.intensity ?? 2.0 },
      uDistortion: { value: parameters.distortion ?? 0.4 },
      uEdgeWidth: { value: parameters.edgeWidth ?? 0.09 },
      uSharpness: { value: parameters.sharpness ?? 3.0 },
      uGlow: { value: parameters.glow ?? 0.35 },
      uDispersion: { value: parameters.dispersion ?? 0.012 },
      uColor: { value: new THREE.Color(parameters.color ?? '#8DEBFF') },
      uBaseColor: { value: new THREE.Color(parameters.baseColor ?? '#06263F') },
      uDebugMode: { value: parameters.debugMode ?? 0 },
    }

    super({
      vertexShader: causticsVertexShader,
      fragmentShader: causticsFragmentShader,
      uniforms,
      transparent: parameters.transparent ?? false,
      depthWrite: parameters.depthWrite ?? true,
      side: parameters.side ?? THREE.DoubleSide,
    })
  }

  get time() { return this.uniforms.uTime.value }
  set time(v) { this.uniforms.uTime.value = v }

  get scale() { return this.uniforms.uScale.value }
  set scale(v) { this.uniforms.uScale.value = v }

  get speed() { return this.uniforms.uSpeed.value }
  set speed(v) { this.uniforms.uSpeed.value = v }

  get intensity() { return this.uniforms.uIntensity.value }
  set intensity(v) { this.uniforms.uIntensity.value = v }

  get distortion() { return this.uniforms.uDistortion.value }
  set distortion(v) { this.uniforms.uDistortion.value = v }

  get edgeWidth() { return this.uniforms.uEdgeWidth.value }
  set edgeWidth(v) { this.uniforms.uEdgeWidth.value = v }

  get sharpness() { return this.uniforms.uSharpness.value }
  set sharpness(v) { this.uniforms.uSharpness.value = v }

  get glow() { return this.uniforms.uGlow.value }
  set glow(v) { this.uniforms.uGlow.value = v }

  get dispersion() { return this.uniforms.uDispersion.value }
  set dispersion(v) { this.uniforms.uDispersion.value = v }

  get color() { return this.uniforms.uColor.value }
  set color(v) { this.uniforms.uColor.value.set(v) }

  get baseColor() { return this.uniforms.uBaseColor.value }
  set baseColor(v) { this.uniforms.uBaseColor.value.set(v) }

  get debugMode() { return this.uniforms.uDebugMode.value }
  set debugMode(v) { this.uniforms.uDebugMode.value = v }
}
