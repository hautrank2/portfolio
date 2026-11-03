import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

export const palette = {
  wall: "", side: "", wood: "", darkWood: "", cream: "", teal: "", ink: "", brass: "",
};

// Resolve the site's actual OKLCH tokens through Canvas, which outputs sRGB for Three.js.
export const configurePalette = (element: HTMLElement) => {
  const styles = getComputedStyle(element);
  const canvas = document.createElement("canvas"); canvas.width = 1; canvas.height = 1;
  const ctx = canvas.getContext("2d");
  const token = (name: string) => {
    if (!ctx) return "rgb(0, 0, 0)";
    ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = styles.getPropertyValue(name).trim(); ctx.fillRect(0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    return `rgb(${r}, ${g}, ${b})`;
  };
  Object.assign(palette, {
    wall: token("--card"), side: token("--secondary"), wood: token("--secondary"), darkWood: token("--background"),
    cream: token("--foreground"), teal: token("--primary"), ink: token("--background"), brass: token("--primary"),
  });
};

export const material = (color: string, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.78, ...extra });

export const box = (parent: THREE.Object3D, size: number[], at: number[], color: string, radius = 0.025) => {
  const mesh = new THREE.Mesh(new RoundedBoxGeometry(size[0], size[1], size[2], 2, Math.min(radius, ...size.map(v => v / 2))), material(color));
  mesh.position.set(at[0], at[1], at[2]);
  mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh);
  return mesh;
};

export const sphere = (parent: THREE.Object3D, size: number[], at: number[], color: string) => {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), material(color));
  mesh.scale.set(size[0], size[1], size[2]); mesh.position.set(at[0], at[1], at[2]);
  mesh.castShadow = true; parent.add(mesh); return mesh;
};

export const cylinder = (parent: THREE.Object3D, radius: number, height: number, at: number[], color: string) => {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * .9, height, 24), material(color));
  mesh.position.set(at[0], at[1], at[2]); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
};

export const canvasTexture = (width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) => {
  const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext("2d"); if (ctx) draw(ctx);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4; return { canvas, texture };
};

export const art = (parent: THREE.Object3D, width: number, height: number, at: number[], texture: THREE.Texture, side = false, frame = true) => {
  const group = new THREE.Group(); group.position.set(at[0], at[1], at[2]);
  if (side) group.rotation.y = Math.PI / 2;
  if (frame) box(group, [width + .09, height + .09, .055], [0, 0, -.025], palette.darkWood, .012);
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }));
  plane.position.z = .008; group.add(plane); parent.add(group); return group;
};

export const label = (parent: THREE.Object3D, text: string, width: number, height: number, at: number[], side = false) => {
  const { texture } = canvasTexture(768, 256, ctx => {
    ctx.fillStyle = palette.cream; ctx.fillRect(0, 0, 768, 256);
    ctx.fillStyle = palette.ink; ctx.font = "bold 62px monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(text, 384, 128);
  });
  return art(parent, width, height, at, texture, side);
};

export const plant = (parent: THREE.Object3D, at: number[], scale = 1) => {
  const group = new THREE.Group(); group.position.set(at[0], at[1], at[2]); group.scale.setScalar(scale);
  cylinder(group, .17, .28, [0, .14, 0], palette.wood);
  cylinder(group, .025, .52, [0, .48, 0], palette.teal);
  for (let i = 0; i < 7; i++) {
    const a = i * 2.4; const leaf = sphere(group, [.09, .24, .065], [Math.sin(a) * .16, .5 + i * .042, Math.cos(a) * .16], i % 2 ? palette.teal : palette.side);
    leaf.rotation.set(Math.cos(a) * .65, a, Math.sin(a) * .65);
  }
  parent.add(group); return group;
};
