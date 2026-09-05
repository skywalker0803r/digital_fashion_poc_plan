import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as dat from 'dat.gui';
import * as ort from 'onnxruntime-web';
import { clothFragmentShader, clothVertexShader, createClothUniforms } from './shaders/ClothMaterialShader.js';
import { ClothSimulation } from './clothSimulation.js';
import './style.css';

const container = document.querySelector('#canvas-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color('#151413');
const camera = new THREE.PerspectiveCamera(32, innerWidth / innerHeight, 0.1, 100);
camera.position.set(0, 0.15, 7.6);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
container.appendChild(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = false;
controls.target.set(0, 0.2, 0);

scene.add(new THREE.HemisphereLight('#f7e9d4', '#29252d', 2.2));
const keyLight = new THREE.DirectionalLight('#fff2dc', 3.2);
keyLight.position.set(-3, 5, 5);
scene.add(keyLight);
const rimLight = new THREE.PointLight('#df6f4c', 8, 12);
rimLight.position.set(3, 1, 3);
scene.add(rimLight);

const settings = { gravity: -9.8, windSpeed: 1.6, shellSdfOffset: 0.03, liningSdfOffset: -0.03, trimSdfOffset: 0.07, reset: () => resetSimulation() };
const simulation = new ClothSimulation();
const layers = [];
const layerConfig = [
  { name: 'Shell', color: '#a84e3b', sheen: '#ffb582', opacity: 0.98, offset: 'shellSdfOffset', layerOffset: 0.01 },
  { name: 'Lining', color: '#263e48', sheen: '#79c1bd', opacity: 0.84, offset: 'liningSdfOffset', layerOffset: -0.04 },
  { name: 'Trim', color: '#d1a25c', sheen: '#fff0b0', opacity: 0.96, offset: 'trimSdfOffset', layerOffset: 0.06 },
];
const geometry = new THREE.BufferGeometry();
const vertexCount = simulation.count;
const indices = [];
for (let y = 0; y < simulation.rows - 1; y += 1) for (let x = 0; x < simulation.columns - 1; x += 1) {
  const a = y * simulation.columns + x; const b = a + 1; const c = a + simulation.columns; const d = c + 1;
  indices.push(a, c, b, b, c, d);
}
geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertexCount * 3), 3));
geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(vertexCount * 3), 3));
geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(vertexCount * 2), 2));
const uvs = geometry.attributes.uv.array;
for (let index = 0; index < vertexCount; index += 1) { uvs[index * 2] = (index % simulation.columns) / (simulation.columns - 1); uvs[index * 2 + 1] = Math.floor(index / simulation.columns) / (simulation.rows - 1); }
geometry.setIndex(indices);
simulation.writeToGeometry(geometry);
geometry.computeBoundingSphere();
for (const config of layerConfig) {
  const uniforms = createClothUniforms({ color: new THREE.Color(config.color), sheenColor: new THREE.Color(config.sheen), opacity: config.opacity, layerOffset: config.layerOffset });
  const material = new THREE.ShaderMaterial({ uniforms, vertexShader: clothVertexShader, fragmentShader: clothFragmentShader, transparent: config.opacity < 1, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geometry.clone(), material);
  mesh.frustumCulled = false;
  mesh.name = `${config.name} layer`;
  scene.add(mesh);
  layers.push({ mesh, uniforms, config });
}

const avatar = new THREE.Group();
const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.78, 1.9, 12, 24), new THREE.MeshStandardMaterial({ color: '#c7b4a0', roughness: 0.7 }));
torso.position.set(0, 0.15, -0.48); torso.scale.x = 0.83; avatar.add(torso);
const head = new THREE.Mesh(new THREE.SphereGeometry(0.5, 24, 16), new THREE.MeshStandardMaterial({ color: '#d6b39b', roughness: 0.74 }));
head.position.set(0, 1.72, -0.43); avatar.add(head);
scene.add(avatar);

const gui = new dat.GUI({ width: 285 });
const physicsFolder = gui.addFolder('PHYSICS');
physicsFolder.add(settings, 'gravity', -20, 0, 0.1).name('Gravity');
physicsFolder.add(settings, 'windSpeed', 0, 5, 0.1).name('Wind Speed');
const sdfFolder = gui.addFolder('LAYERED SDF OFFSETS');
for (const config of layerConfig) sdfFolder.add(settings, config.offset, -0.15, 0.15, 0.005).name(config.name);
gui.add(settings, 'reset').name('Reset simulation');
physicsFolder.open(); sdfFolder.open();

let lastTime = performance.now();
function resetSimulation() { simulation.positions.forEach((point, index) => { point.set((index % simulation.columns) / (simulation.columns - 1) * 2.7 - 1.35, 2.45 - Math.floor(index / simulation.columns) / (simulation.rows - 1) * 3.25, 0); simulation.previous[index].copy(point); }); }
function animate(now) {
  requestAnimationFrame(animate);
  const delta = (now - lastTime) / 1000; lastTime = now;
  simulation.step(delta, settings);
  layers.forEach(({ mesh, uniforms, config }) => { simulation.writeToGeometry(mesh.geometry); uniforms.uTime.value = now / 1000; uniforms.uWind.value = settings.windSpeed; uniforms.uStress.value = Math.min(1, Math.abs(settings.gravity) / 16 + settings.windSpeed / 12); uniforms.uLayerOffset.value = settings[config.offset] + config.layerOffset; });
  controls.update(); renderer.render(scene, camera);
}
requestAnimationFrame(animate);
ort.env.wasm.numThreads = 1;
document.querySelector('#status-text').textContent = `SIMULATION ONLINE / ONNX ${ort.env.wasm.numThreads} THREAD`;
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });