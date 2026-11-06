import * as THREE from "three";

import { buildCharacter } from "./character";
import type { ArmPose, BodyPose, CharacterPalette, PortraitSceneOptions, Vec3 } from "./type";

const PALETTE: CharacterPalette = {
  skin: "#d2a383", // sampled from the lit cheek of the photo, so the face shell blends in
  hair: "#16171b",
  shirt: "#e6e9ef",
  pants: "#2a2e35", // charcoal dress trousers
  shoe: "#141210",
  button: "#c7ccd6",
  frame: "#a59f78", // the photo frames are a muted gold
};
/** Where the camera looks: chest height, so head to belt fills the frame. */
const FOCUS_Y = 2.85;
/** His face, cut from the portrait photo (glasses included), feathered at the edge. */
const FACE_URL = "/img/3d/face.webp";
const DOWN = new THREE.Vector3(0, -1, 0);

/** CSS tokens are `oklch(…)`; a 1×1 canvas turns them into something THREE.Color reads. */
const readToken = (element: HTMLElement, name: string, fallback: string) => {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext("2d");
  const value = getComputedStyle(element).getPropertyValue(name).trim();
  if (!ctx || !value) return new THREE.Color(fallback);
  ctx.fillStyle = value;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return new THREE.Color(`rgb(${r}, ${g}, ${b})`);
};

const smooth = (t: number) => t * t * (3 - 2 * t);
const mix3 = (a: Vec3, b: Vec3, k: number): Vec3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const mixArm = (a: ArmPose, b: ArmPose, k: number): ArmPose => ({ upper: mix3(a.upper, b.upper, k), fore: mix3(a.fore, b.fore, k) });

const mixPose = (a: BodyPose, b: BodyPose, k: number): BodyPose => ({
  side: a.side + (b.side - a.side) * k,
  hips: mix3(a.hips, b.hips, k),
  spine: mix3(a.spine, b.spine, k),
  chest: mix3(a.chest, b.chest, k),
  head: mix3(a.head, b.head, k),
  armL: mixArm(a.armL, b.armL, k),
  armR: mixArm(a.armR, b.armR, k),
  wave: a.wave + (b.wave - a.wave) * k,
  shot: a.shot + (b.shot - a.shot) * k,
});

const poseAt = (poses: BodyPose[], progress: number) => {
  const last = poses.length - 1;
  const clamped = Math.max(0, Math.min(last, progress));
  const from = Math.floor(clamped);
  return mixPose(poses[from], poses[Math.min(last, from + 1)], smooth(clamped - from));
};

/** Damps every number of `current` towards `goal` — the pose eases instead of snapping to the scroll. */
const dampPose = (current: BodyPose, goal: BodyPose, delta: number) => {
  const k = 1 - Math.exp(-6 * delta);
  return mixPose(current, goal, k);
};

const aimArm = (shoulder: THREE.Object3D, elbow: THREE.Object3D, arm: ArmPose, swing: number) => {
  const upper = new THREE.Vector3(...arm.upper).normalize();
  const fore = new THREE.Vector3(...arm.fore).normalize();
  if (swing) fore.applyAxisAngle(new THREE.Vector3(0, 0, 1), swing).normalize();
  shoulder.quaternion.setFromUnitVectors(DOWN, upper);
  // the elbow lives inside the shoulder's frame: undo the shoulder first
  const world = new THREE.Quaternion().setFromUnitVectors(DOWN, fore);
  elbow.quaternion.copy(shoulder.quaternion).invert().multiply(world);
};

export const createPortraitScene = ({ container, poses, onReady, onError }: PortraitSceneOptions) => {
  const primary = readToken(container, "--primary", "#2b9ac8");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const debug = new URLSearchParams(window.location.search).get("pose");
  const lockedProgress = process.env.NODE_ENV === "development" && debug !== null ? Number(debug) : null;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.domElement.setAttribute("role", "img");
  renderer.domElement.setAttribute("aria-label", "Nhân vật 3D của Hậu: vẫy tay, khoanh tay và xoay người theo thanh cuộn.");
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x2a3140, 1.5));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(3, 5, 6);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 0.6);
  fill.position.set(-5, 2, 4);
  scene.add(fill);
  // rims in the site's primary colour outline the silhouette against the dark side
  const rimL = new THREE.DirectionalLight(primary, 2.2);
  rimL.position.set(-5, 3, -5);
  scene.add(rimL);
  const rimR = new THREE.DirectionalLight(primary, 1.6);
  rimR.position.set(5, 2, -4);
  scene.add(rimR);

  const rig = new THREE.Group();
  scene.add(rig);
  let joints: ReturnType<typeof buildCharacter>["joints"] | null = null;
  let disposed = false;
  try {
    const character = buildCharacter(PALETTE);
    rig.add(character.root);
    joints = character.joints;
    new THREE.TextureLoader().loadAsync(FACE_URL).then((texture) => {
      if (disposed) { texture.dispose(); return; }
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      character.setFace(texture);
    }).catch(() => { /* no face texture: the head stays plain skin */ });
  } catch {
    onError();
  }

  let frame = 0;
  let target = lockedProgress ?? 0;
  let pointerX = 0;
  let pointerY = 0;
  let halfWidth = 2;
  let narrow = false;
  let current = poseAt(poses, target);

  const resize = () => {
    const { clientWidth: width, clientHeight: height } = container;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    narrow = camera.aspect < 0.95;
    camera.updateProjectionMatrix();
  };

  /** Head-to-belt close-up at shot 0, the whole figure (shoes included) at shot 1. */
  const frameShot = (shot: number) => {
    // a phone shows the whole upper body from further back, panels go below
    const distance = THREE.MathUtils.lerp(narrow ? 8.4 : 6.2, narrow ? 15 : 12.5, shot);
    const focus = THREE.MathUtils.lerp(narrow ? FOCUS_Y - 0.6 : FOCUS_Y, 1.85, shot);
    camera.position.set(0, focus + 0.05, distance);
    camera.lookAt(0, focus, 0);
    halfWidth = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * distance * camera.aspect;
  };
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();

  const timer = new THREE.Timer();
  timer.connect(document);

  const render = (time: number) => {
    if (disposed) return;
    frame = requestAnimationFrame(render);
    timer.update(time);
    const delta = Math.min(timer.getDelta(), 0.1);
    const elapsed = timer.getElapsed();
    const still = reduced.matches;

    const goal = poseAt(poses, target);
    current = still ? goal : dampPose(current, goal, delta);

    frameShot(current.shot);
    const sideX = narrow ? 0 : Math.min(2.4 + current.shot * 2.4, halfWidth * 0.48);
    rig.position.x = current.side * sideX;
    rig.position.y = narrow ? 0.5 : 0;

    if (joints) {
      const breath = still ? 0 : Math.sin(elapsed * 1.6);
      const sway = still ? 0 : Math.sin(elapsed * 0.55) * 0.025;
      joints.hips.rotation.set(current.hips[0], current.hips[1] + sway, current.hips[2]);
      joints.spine.rotation.set(current.spine[0] + breath * 0.008, current.spine[1], current.spine[2]);
      joints.chest.rotation.set(current.chest[0], current.chest[1], current.chest[2]);
      joints.chest.scale.setScalar(1 + breath * 0.006);
      joints.head.rotation.set(
        current.head[0] + pointerY * 0.12,
        current.head[1] + pointerX * 0.28,
        current.head[2],
        "YXZ",
      );
      const wave = still ? 0 : Math.sin(elapsed * 7) * 0.38 * current.wave;
      aimArm(joints.shoulderL, joints.elbowL, current.armL, 0);
      aimArm(joints.shoulderR, joints.elbowR, current.armR, wave);
      // open the right hand towards the viewer while it waves
      joints.wristR.rotation.set(0, current.wave * -0.6, wave * 0.4);
    }

    renderer.render(scene, camera);
  };
  frame = requestAnimationFrame(render);
  if (joints) onReady();

  return {
    /** Fractional section index: 1.5 = halfway from section 1 to section 2. */
    setProgress: (value: number) => { if (lockedProgress === null) target = value; },
    /** Pointer position in -1…1 — the head follows it a little. */
    setPointer: (x: number, y: number) => { pointerX = x; pointerY = y; },
    dispose: () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      timer.dispose();
      const geometries = new Set<THREE.BufferGeometry>();
      const materials = new Set<THREE.Material>();
      scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        geometries.add(object.geometry);
        const list: THREE.Material[] = Array.isArray(object.material) ? object.material : [object.material];
        list.forEach((material) => materials.add(material));
      });
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => {
        if (material instanceof THREE.MeshStandardMaterial) material.map?.dispose();
        material.dispose();
      });
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
};

export type PortraitScene = ReturnType<typeof createPortraitScene>;
