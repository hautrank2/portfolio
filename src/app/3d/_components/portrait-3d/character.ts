import * as THREE from "three";

import type { CharacterJoints, CharacterPalette } from "./type";

/**
 * A stylised figure built from primitives — no model file to download. Every
 * joint is an empty `Object3D`, and the body parts hang off them, so a pose is
 * nothing more than rotating joints: the shoulder turns the whole arm, the
 * elbow only the forearm and hand. Units are roughly 2× metres; feet at y = 0,
 * the character faces +Z (towards the camera).
 */

const lathe = (profile: [number, number][], material: THREE.Material, depth = 0.64) => {
  const mesh = new THREE.Mesh(new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 40), material);
  mesh.scale.z = depth; // flatten front-to-back: a torso is not a barrel
  return mesh;
};

const capsule = (radius: number, length: number, material: THREE.Material, y: number) => {
  const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(radius, length, 6, 16), material);
  mesh.position.y = y;
  return mesh;
};

const sphere = (radius: number, material: THREE.Material, at: [number, number, number], scale: [number, number, number] = [1, 1, 1]) => {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 20), material);
  mesh.position.set(...at);
  mesh.scale.set(...scale);
  return mesh;
};

const joint = (parent: THREE.Object3D, at: [number, number, number]) => {
  const group = new THREE.Group();
  group.position.set(...at);
  parent.add(group);
  return group;
};

const buildHand = (material: THREE.Material, side: 1 | -1) => {
  const hand = new THREE.Group();
  hand.add(sphere(0.085, material, [0, -0.1, 0], [0.95, 1.35, 0.55]));
  // thumb on the side facing the body's front
  const thumb = capsule(0.028, 0.08, material, 0);
  thumb.position.set(-0.06 * side, -0.07, 0.045);
  thumb.rotation.z = 0.6 * side;
  hand.add(thumb);
  return hand;
};

const buildArm = (chest: THREE.Object3D, materials: Record<"shirt" | "skin", THREE.Material>, side: 1 | -1) => {
  const shoulder = joint(chest, [0.47 * side, 0.74, 0]);
  shoulder.add(sphere(0.15, materials.shirt, [0, 0, 0]));
  shoulder.add(capsule(0.125, 0.42, materials.shirt, -0.3));
  const elbow = joint(shoulder, [0, -0.6, 0]);
  elbow.add(sphere(0.115, materials.shirt, [0, 0, 0]));
  elbow.add(capsule(0.105, 0.36, materials.shirt, -0.24));
  // rolled cuff, then the bare wrist
  const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.112, 0.112, 0.06, 20), materials.shirt);
  cuff.position.y = -0.46;
  elbow.add(cuff);
  elbow.add(capsule(0.07, 0.06, materials.skin, -0.52));
  const wrist = joint(elbow, [0, -0.55, 0]);
  wrist.add(buildHand(materials.skin, side));
  return { shoulder, elbow, wrist };
};

/** Leather oxford: thin sole, rounded upper, a toe that tapers forward. */
const buildShoe = (materials: Record<"shoe" | "sole", THREE.Material>) => {
  const shoe = new THREE.Group();
  const sole = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.035, 0.48), materials.sole);
  sole.position.set(0, -0.05, 0.08);
  shoe.add(sole);
  shoe.add(sphere(0.12, materials.shoe, [0, 0.01, 0.17], [0.92, 0.48, 1.25])); // toe box
  shoe.add(sphere(0.12, materials.shoe, [0, 0.04, -0.04], [0.95, 0.62, 1.05])); // heel and quarter
  const heel = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.06, 0.12), materials.sole);
  heel.position.set(0, -0.07, -0.1);
  shoe.add(heel);
  return shoe;
};

const buildLeg = (hips: THREE.Object3D, materials: Record<"pants" | "crease" | "shoe" | "sole", THREE.Material>, side: 1 | -1) => {
  const hip = joint(hips, [0.19 * side, -0.05, 0]);
  // dress trousers: straight, a little loose, with a pressed crease down the front
  hip.add(capsule(0.175, 0.64, materials.pants, -0.44));
  const knee = joint(hip, [0, -0.9, 0]);
  knee.add(sphere(0.158, materials.pants, [0, 0, 0]));
  const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.152, 0.148, 0.78, 24), materials.pants);
  shin.position.y = -0.4;
  knee.add(shin);
  for (const [parent, y, length, radius] of [[hip, -0.44, 0.8, 0.176], [knee, -0.4, 0.78, 0.153]] as const) {
    const crease = new THREE.Mesh(new THREE.BoxGeometry(0.008, length, 0.008), materials.crease);
    crease.position.set(0, y, radius);
    parent.add(crease);
  }
  const shoe = buildShoe(materials);
  shoe.position.set(0, -0.84, 0);
  knee.add(shoe);
  return hip;
};

const buildHead = (neck: THREE.Object3D, palette: CharacterPalette) => {
  const skin = new THREE.MeshStandardMaterial({ color: palette.skin, roughness: 0.55 });
  const hair = new THREE.MeshStandardMaterial({ color: palette.hair, roughness: 0.78 });
  const gold = new THREE.MeshStandardMaterial({ color: palette.frame, roughness: 0.25, metalness: 0.9 });

  const head = joint(neck, [0, 0.22, 0]);
  const skull = new THREE.Group();
  skull.position.y = 0.28;
  skull.scale.setScalar(1.12); // a slightly big head reads friendlier at this size
  head.add(skull);

  skull.add(sphere(0.29, skin, [0, 0, 0], [0.9, 1.05, 0.98]));
  skull.add(sphere(0.2, skin, [0, -0.12, 0.03], [0.95, 0.8, 0.9])); // jaw and chin
  skull.add(sphere(0.06, skin, [0.27, -0.01, -0.01], [0.42, 1, 0.75]));
  skull.add(sphere(0.06, skin, [-0.27, -0.01, -0.01], [0.42, 1, 0.75]));

  // The face is his own: the photo's face (glasses included) on a shell that
  // wraps the front of the skull. Its texture arrives later — see `setFace`.
  const faceMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, transparent: true, alphaTest: 0.02, visible: false });
  const face = new THREE.Mesh(
    // phi 2.0 rad wide around +Z, theta from the brow (0.85) down to the chin (2.82)
    new THREE.SphereGeometry(0.294, 48, 32, Math.PI / 2 - 1, 2, 0.85, 1.97),
    faceMaterial,
  );
  face.scale.set(0.9, 1.05, 0.98);
  skull.add(face);

  // glasses temples running back to the ears — the photo only shows the front
  for (const side of [1, -1]) {
    const temple = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.2, 6), gold);
    temple.rotation.x = Math.PI / 2;
    temple.position.set(0.245 * side, 0.03, 0.08);
    skull.add(temple);
  }

  const setFace = (texture: THREE.Texture) => {
    faceMaterial.map = texture;
    faceMaterial.visible = true;
    faceMaterial.needsUpdate = true;
  };

  // Hair, after the photo: a thick rounded cut, full on top and at the sides,
  // with a heavy fringe down to the brows. The photo's own fringe sits at the
  // top of the face texture, so the 3D fringe ends right where it begins.
  const crown = new THREE.Mesh(new THREE.SphereGeometry(0.31, 48, 24, 0, Math.PI * 2, 0, Math.PI * 0.5), hair);
  crown.position.y = 0.03;
  crown.scale.set(0.94, 1.02, 1.0);
  skull.add(crown);
  skull.add(sphere(0.288, hair, [0, -0.05, -0.07], [0.95, 1, 0.9])); // back, down to the nape
  skull.add(sphere(0.16, hair, [0.02, 0.255, 0.04], [1.15, 0.42, 1.1])); // the volume on top
  for (const side of [1, -1]) {
    skull.add(sphere(0.11, hair, [0.245 * side, 0.11, 0.0], [0.36, 0.72, 1.05])); // over the ears
  }
  const fringe = new THREE.Mesh(
    // a band around the front of the head from the hairline down to where the
    // photo's own fringe takes over (the top of the face texture)
    new THREE.SphereGeometry(0.312, 48, 12, Math.PI / 2 - 1.0, 2.0, Math.PI * 0.18, Math.PI * 0.18),
    hair,
  );
  fringe.scale.set(0.95, 1.04, 1.02);
  fringe.position.y = 0.012;
  skull.add(fringe);
  return { head, setFace };
};

export const buildCharacter = (palette: CharacterPalette) => {
  // cotton shirt with a soft sheen, wool trousers, polished leather
  const shirt = new THREE.MeshPhysicalMaterial({ color: palette.shirt, roughness: 0.72, sheen: 0.4, sheenRoughness: 0.6, sheenColor: 0xffffff });
  const skin = new THREE.MeshStandardMaterial({ color: palette.skin, roughness: 0.55 });
  const pants = new THREE.MeshStandardMaterial({ color: palette.pants, roughness: 0.68 });
  const crease = new THREE.MeshStandardMaterial({ color: palette.pants, roughness: 0.35, emissive: 0xffffff, emissiveIntensity: 0.03 });
  const shoe = new THREE.MeshPhysicalMaterial({ color: palette.shoe, roughness: 0.3, clearcoat: 0.9, clearcoatRoughness: 0.15 });
  const sole = new THREE.MeshStandardMaterial({ color: palette.shoe, roughness: 0.8 });
  const leather = new THREE.MeshPhysicalMaterial({ color: palette.shoe, roughness: 0.4, clearcoat: 0.5 });
  const steel = new THREE.MeshStandardMaterial({ color: 0xc9ccd2, roughness: 0.25, metalness: 1 });
  const button = new THREE.MeshStandardMaterial({ color: palette.button, roughness: 0.4 });

  const root = new THREE.Group();
  const hips = joint(root, [0, 1.9, 0]);
  hips.add(lathe([[0, -0.2], [0.34, -0.2], [0.355, 0], [0.345, 0.12], [0, 0.12]], pants, 0.68));
  // shirt tucked in under a leather belt with a brushed-steel buckle
  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.352, 0.352, 0.065, 40), leather);
  belt.position.y = 0.1;
  belt.scale.z = 0.69;
  hips.add(belt);
  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.075, 0.02), steel);
  buckle.position.set(0, 0.1, 0.245);
  hips.add(buckle);
  const legs = [buildLeg(hips, { pants, crease, shoe, sole }, 1), buildLeg(hips, { pants, crease, shoe, sole }, -1)];

  const spine = joint(hips, [0, 0.12, 0]);
  spine.add(lathe([[0, 0], [0.33, 0], [0.34, 0.18], [0.37, 0.4], [0, 0.4]], shirt));
  const chest = joint(spine, [0, 0.36, 0]);
  chest.add(lathe([[0, 0], [0.38, 0], [0.43, 0.28], [0.45, 0.6], [0.36, 0.76], [0.16, 0.84], [0, 0.84]], shirt));
  // placket buttons down the front
  // [parent, y, z on the surface]
  const buttons: [THREE.Object3D, number, number][] = [[chest, 0.58, 0.29], [chest, 0.36, 0.28], [chest, 0.14, 0.26], [spine, 0.3, 0.24], [spine, 0.1, 0.225]];
  buttons.forEach(([parent, y, z]) => {
    const dot = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.01, 10), button);
    dot.rotation.x = Math.PI / 2;
    dot.position.set(0, y, z);
    parent.add(dot);
  });
  // collar: two wings folded over the neck opening
  for (const side of [1, -1]) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.12, 0.02), shirt);
    wing.position.set(0.085 * side, 0.8, 0.13);
    wing.rotation.set(-0.5, 0.45 * side, -0.55 * side);
    chest.add(wing);
  }

  const neck = joint(chest, [0, 0.76, 0]);
  neck.add(capsule(0.1, 0.18, skin, 0.1));
  const { head, setFace } = buildHead(neck, palette);

  const left = buildArm(chest, { shirt, skin }, 1);
  const right = buildArm(chest, { shirt, skin }, -1);

  const joints: CharacterJoints = {
    hips, spine, chest, neck, head,
    shoulderL: left.shoulder, elbowL: left.elbow, wristL: left.wrist,
    shoulderR: right.shoulder, elbowR: right.elbow, wristR: right.wrist,
  };
  return { root, joints, setFace, legs };
};
