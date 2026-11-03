import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import { buildRoom } from "./build-room";
import { chapters } from "./chapters";
import { configurePalette, palette } from "./objects";
import type { RoomSceneOptions, RoomSpot } from "./type";

export const createRoomScene = ({ container, onReady, onError, onSelect }: RoomSceneOptions) => {
  configurePalette(container);
  const scene = new THREE.Scene();
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.4;
  renderer.domElement.setAttribute("aria-label", "Phòng ngủ 3D ban đêm. Cuộn để chuyển góc phòng; kéo để nhìn quanh. Dùng các nút bên dưới hoặc phím mũi tên để xem thông tin.");
  renderer.domElement.setAttribute("role", "img");
  container.appendChild(renderer.domElement);
  const camera = new THREE.PerspectiveCamera(39, 1, .1, 100);
  camera.position.fromArray(chapters[0].camera);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.fromArray(chapters[0].target);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.enableZoom = false;
  controls.minDistance = 3;
  controls.maxDistance = 28;
  controls.minPolarAngle = .3;
  controls.maxPolarAngle = 1.4;
  controls.minAzimuthAngle = -Math.PI;
  controls.maxAzimuthAngle = Math.PI;
  controls.rotateSpeed = .4;
  const ambient = new THREE.HemisphereLight(palette.cream, palette.side, 1.2);
  scene.add(ambient);
  const moon = new THREE.DirectionalLight(palette.teal, 2.2);
  moon.position.set(-4, 7, 4);
  moon.castShadow = true;
  moon.shadow.mapSize.set(2048, 2048);
  moon.shadow.normalBias = .035;
  Object.assign(moon.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: .5, far: 25 });
  scene.add(moon);
  const fill = new THREE.DirectionalLight(palette.cream, .7);
  fill.position.set(5, 6, 4);
  scene.add(fill);
  const lamp = new THREE.PointLight(palette.teal, 8, 6, 2);
  lamp.position.set(1.12, 1.4, -2.43);
  scene.add(lamp);
  const monitor = new THREE.PointLight(palette.teal, 5, 5, 2);
  monitor.position.set(-2.6, 1.8, -.3);
  scene.add(monitor);
  const tvGlow = new THREE.PointLight(palette.teal, 2, 4, 2);
  tvGlow.position.set(2.4, 1.3, .9);
  scene.add(tvGlow);
  const room = buildRoom();
  scene.add(room.root);

  // Thin emissive strips anchor the diorama in the same cyan as the site's primary token.
  const glowMaterial = new THREE.MeshStandardMaterial({ color: palette.teal, emissive: palette.teal, emissiveIntensity: 2 });
  for (const [size, at] of [ [[8.1, .018, .018], [0, .2, -2.99]], [[.018, .018, 6], [-3.97, .2, 0]] ]) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), glowMaterial);
    strip.position.set(at[0], at[1], at[2]);
    scene.add(strip);
  }
  const dustPositions = new Float32Array(65 * 3);
  for (let i = 0; i < 65; i++) { dustPositions[i * 3] = Math.sin(i * 17.3) * 6; dustPositions[i * 3 + 1] = (i * .73) % 5; dustPositions[i * 3 + 2] = Math.cos(i * 7.9) * 4; }
  const dustGeometry = new THREE.BufferGeometry(); dustGeometry.setAttribute("position", new THREE.BufferAttribute(dustPositions, 3));
  const dust = new THREE.Points(dustGeometry, new THREE.PointsMaterial({ color: palette.teal, size: .022, transparent: true, opacity: .45, depthWrite: false }));
  scene.add(dust);

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const fromCamera = camera.position.clone();
  const fromTarget = controls.target.clone();
  const toCamera = camera.position.clone();
  const toTarget = controls.target.clone();
  let downX = 0; let downY = 0; let disposed = false; let frame = 0; let previous = 0;
  let visible = !document.hidden; let tvOn = true; let transitionStart = -2000; let chapterIndex = 0; let viewWidth = 1; let viewHeight = 1; let shiftX = -70; let shiftY = 0;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const down = (event: PointerEvent) => { downX = event.clientX; downY = event.clientY; };
  const up = (event: PointerEvent) => {
    if (Math.hypot(event.clientX - downX, event.clientY - downY) > 6) return;
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    let object: THREE.Object3D | null = raycaster.intersectObjects(room.root.children, true)[0]?.object ?? null;
    while (object) {
      const spot = object.userData.spot as RoomSpot | undefined;
      if (spot) { onSelect(spot); break; }
      object = object.parent;
    }
  };
  const resize = () => {
    const { width, height } = container.getBoundingClientRect();
    if (!width || !height) return;
    viewWidth = width; viewHeight = height;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.fov = width < 650 ? 58 : 39;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize); observer.observe(container); resize();
  const visibility = () => { visible = !document.hidden; };
  document.addEventListener("visibilitychange", visibility);
  renderer.domElement.addEventListener("pointerdown", down);
  renderer.domElement.addEventListener("pointerup", up);
  const lost = (event: Event) => { event.preventDefault(); onError(); };
  renderer.domElement.addEventListener("webglcontextlost", lost);
  const render = (time: number) => {
    if (disposed) return;
    frame = requestAnimationFrame(render);
    const moving = time - transitionStart < 1800;
    if (!visible || (!moving && time - previous < 1000 / 30)) return;
    const delta = Math.min(.1, (time - previous) / 1000);
    previous = time;
    const progress = reduced.matches ? 1 : Math.min(1, (time - transitionStart) / 1800);
    if (progress < 1) {
      const eased = progress ** 3 * (progress * (progress * 6 - 15) + 10);
      camera.position.lerpVectors(fromCamera, toCamera, eased);
      controls.target.lerpVectors(fromTarget, toTarget, eased);
    } else if (!controls.enabled) {
      camera.position.copy(toCamera); controls.target.copy(toTarget); controls.enabled = true;
    }
    if (progress < 1) camera.lookAt(controls.target);
    else controls.update();
    const mobile = viewWidth < 700;
    const desiredX = mobile ? 0 : chapterIndex === 0 ? -100 : 170;
    const desiredY = mobile && chapterIndex > 0 ? 95 : 0;
    shiftX = reduced.matches ? desiredX : THREE.MathUtils.damp(shiftX, desiredX, 4, delta);
    shiftY = reduced.matches ? desiredY : THREE.MathUtils.damp(shiftY, desiredY, 4, delta);
    camera.setViewOffset(viewWidth, viewHeight, shiftX, shiftY, viewWidth, viewHeight);
    room.dog.scale.y = .62 * (reduced.matches ? 1 : 1 + Math.sin(time * .0018) * .035);
    dust.rotation.y = reduced.matches ? 0 : time * .000012;
    tvGlow.intensity = tvOn ? 2 + (reduced.matches ? 0 : Math.sin(time * .002) * .2) : 0;
    room.animate(time, tvOn, reduced.matches);
    renderer.render(scene, camera);

  };
  frame = requestAnimationFrame(render);
  onReady();
  return {
    goTo: (index: number) => {
      const chapter = chapters[index]; if (!chapter) return;
      chapterIndex = index;
      fromCamera.copy(camera.position); fromTarget.copy(controls.target);
      toCamera.fromArray(chapter.camera); toTarget.fromArray(chapter.target);
      controls.enabled = false; transitionStart = performance.now();
    },
    toggleTv: (value: boolean) => { tvOn = value; },
    dispose: () => {
      disposed = true; cancelAnimationFrame(frame); observer.disconnect(); controls.dispose();
      document.removeEventListener("visibilitychange", visibility);
      renderer.domElement.removeEventListener("pointerdown", down);
      renderer.domElement.removeEventListener("pointerup", up);
      renderer.domElement.removeEventListener("webglcontextlost", lost);
      const textures = new Set<THREE.Texture>();
      const geometries = new Set<THREE.BufferGeometry>();
      const materials = new Set<THREE.Material>();
      scene.traverse(object => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
          if (object instanceof THREE.InstancedMesh) object.dispose();
          geometries.add(object.geometry);
          const list = Array.isArray(object.material) ? object.material : [object.material];
          list.forEach(mat => { materials.add(mat); for (const value of Object.values(mat)) if (value instanceof THREE.Texture) textures.add(value); });
        }
      });
      geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose());
      renderer.dispose(); renderer.domElement.remove();
    },
  };
};
