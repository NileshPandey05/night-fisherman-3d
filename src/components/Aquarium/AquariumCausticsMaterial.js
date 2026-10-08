import * as THREE from 'three'
import { aquariumCausticsVertexShader, aquariumCausticsFragmentShader } from './aquariumShaders'

export class AquariumCausticsMaterial extends THREE.ShaderMaterial {
  constructor(parameters = {}) {
    const uniforms = {
      uTime: { value: 0.0 },
      uLevel: { value: parameters.level ?? 3 },
      uScale: { value: parameters.scale ?? 4.0 },
      uSpeed: { value: parameters.speed ?? 0.75 },
      uIntensity: { value: parameters.intensity ?? 2.2 },
      uSharpness: { value: parameters.sharpness ?? 3.5 },
      uDispersion: { value: parameters.dispersion ?? 0.015 },
      uColor: { value: new THREE.Color(parameters.color ?? '#99e6ff') },
      uBaseColor: { value: new THREE.Color(parameters.baseColor ?? '#0b2b3d') },
      uDeepColor: { value: new THREE.Color(parameters.deepColor ?? '#04121c') },
      uLightShafts: { value: parameters.lightShafts ?? 0.6 },
    }

    super({
      vertexShader: aquariumCausticsVertexShader,
      fragmentShader: aquariumCausticsFragmentShader,
      uniforms,
      side: THREE.DoubleSide,
    })
  }

  get time() { return this.uniforms.uTime.value }
  set time(v) { this.uniforms.uTime.value = v }

  get level() { return this.uniforms.uLevel.value }
  set level(v) { this.uniforms.uLevel.value = v }

  get scale() { return this.uniforms.uScale.value }
  set scale(v) { this.uniforms.uScale.value = v }

  get speed() { return this.uniforms.uSpeed.value }
  set speed(v) { this.uniforms.uSpeed.value = v }

  get intensity() { return this.uniforms.uIntensity.value }
  set intensity(v) { this.uniforms.uIntensity.value = v }

  get sharpness() { return this.uniforms.uSharpness.value }
  set sharpness(v) { this.uniforms.uSharpness.value = v }

  get dispersion() { return this.uniforms.uDispersion.value }
  set dispersion(v) { this.uniforms.uDispersion.value = v }

  get color() { return this.uniforms.uColor.value }
  set color(v) {
    if (v instanceof THREE.Color) {
      this.uniforms.uColor.value.copy(v)
    } else {
      this.uniforms.uColor.value.set(v)
    }
  }

  get baseColor() { return this.uniforms.uBaseColor.value }
  set baseColor(v) {
    if (v instanceof THREE.Color) {
      this.uniforms.uBaseColor.value.copy(v)
    } else {
      this.uniforms.uBaseColor.value.set(v)
    }
  }

  get deepColor() { return this.uniforms.uDeepColor.value }
  set deepColor(v) {
    if (v instanceof THREE.Color) {
      this.uniforms.uDeepColor.value.copy(v)
    } else {
      this.uniforms.uDeepColor.value.set(v)
    }
  }

  get lightShafts() { return this.uniforms.uLightShafts.value }
  set lightShafts(v) { this.uniforms.uLightShafts.value = v }
}
