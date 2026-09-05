export const clothVertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uStress;
  uniform float uLayerOffset;
  uniform float uWind;
  varying vec2 vUv;
  varying float vStress;
  varying vec3 vWorldNormal;

  void main() {
    vUv = uv;
    vec3 transformed = position;
    float edge = smoothstep(0.0, 0.38, uv.y);
    float weave = sin(uv.x * 92.0 + uTime * 2.7) * sin(uv.y * 68.0 - uTime * 1.9);
    float wrinkle = sin(uv.x * 21.0 + uTime * 3.0) * sin(uv.y * 17.0 - uTime * 2.0);
    float gust = sin(uv.x * 4.0 + uTime * (1.4 + uWind * 0.15)) * 0.012 * uWind;
    transformed.z += (weave * 0.0018 + wrinkle * 0.012 * uStress + gust) * edge;
    transformed.x += sin(uv.y * 5.0 + uTime) * 0.012 * uWind * edge;
    transformed.y += uLayerOffset;

    vec4 worldPosition = modelMatrix * vec4(transformed, 1.0);
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vStress = clamp(uStress * (0.62 + abs(wrinkle) * 0.5), 0.0, 1.0);
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

export const clothFragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uSheenColor;
  uniform float uOpacity;
  varying vec2 vUv;
  varying float vStress;
  varying vec3 vWorldNormal;

  void main() {
    vec3 viewDirection = normalize(cameraPosition - vWorldNormal);
    float grazing = pow(1.0 - abs(dot(normalize(vWorldNormal), normalize(viewDirection))), 3.0);
    float weave = 0.94 + 0.06 * sin(vUv.x * 260.0) * sin(vUv.y * 180.0);
    vec3 base = uColor * weave;
    vec3 stressTint = mix(base, uSheenColor, vStress * 0.28);
    vec3 finalColor = stressTint + uSheenColor * grazing * 0.32;
    gl_FragColor = vec4(finalColor, uOpacity);
  }
`;

export function createClothUniforms({ color, sheenColor, opacity = 1, layerOffset = 0 }) {
  return {
    uTime: { value: 0 },
    uStress: { value: 0.22 },
    uLayerOffset: { value: layerOffset },
    uWind: { value: 1.2 },
    uColor: { value: color },
    uSheenColor: { value: sheenColor },
    uOpacity: { value: opacity },
  };
}