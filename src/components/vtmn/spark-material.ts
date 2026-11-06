import * as THREE from "three";

export function createSparkMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    uniforms: { uPixel: { value: 1 } },
    vertexShader: `varying vec3 vColor; uniform float uPixel;
        void main(){vColor=color;vec4 mv=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(100.*uPixel/max(1.,-mv.z),1.,9.);}`,
    fragmentShader: `varying vec3 vColor; void main(){float d=length(gl_PointCoord-.5)*2.;float a=exp(-d*d*5.)*(1.-smoothstep(.7,1.,d));gl_FragColor=vec4(vColor,a);}`,
  });
}
