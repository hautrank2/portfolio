import * as THREE from "three";

import { collectionRows } from "./collection";
import { box, palette } from "./objects";

export const addFigureCabinet = (root: THREE.Group) => {
  const cabinet = new THREE.Group();
  cabinet.position.set(-.25, 0, -2.6);
  cabinet.userData.spot = "collection";
  root.add(cabinet);
  box(cabinet, [1.95, 3.03, .12], [0, 1.57, -.26], palette.ink);
  for (const x of [-.99, .99]) box(cabinet, [.07, 3.1, .62], [x, 1.58, -.02], palette.side);
  for (let i = 0; i <= 6; i++) {
    box(cabinet, [2.02, .045, .64], [0, .1 + i * .49, -.02], palette.side);
    const led = new THREE.Mesh(new THREE.BoxGeometry(1.88, .012, .016), new THREE.MeshBasicMaterial({ color: palette.teal }));
    led.position.set(0, .13 + i * .49, .28); cabinet.add(led);
  }
  // Figures share geometry and are batched by material: detailed shelves without hundreds of draw calls.
  const shapes = {
    sphere: new THREE.SphereGeometry(1, 10, 7),
    box: new THREE.BoxGeometry(1, 1, 1),
    cone: new THREE.ConeGeometry(1, 1, 6),
    cylinder: new THREE.CylinderGeometry(1, 1, 1, 12),
  };
  const batches = new Map<string, { shape: keyof typeof shapes; color: string; matrices: THREE.Matrix4[] }>();
  const add = (shape: keyof typeof shapes, color: string, at: number[], scale: number[], rotation = 0) => {
    const key = `${shape}:${color}`;
    if (!batches.has(key)) batches.set(key, { shape, color, matrices: [] });
    const matrix = new THREE.Matrix4().compose(new THREE.Vector3(at[0], at[1], at[2]), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, rotation)), new THREE.Vector3(scale[0], scale[1], scale[2]));
    batches.get(key)?.matrices.push(matrix);
  };
  for (const [rowIndex, row] of collectionRows.entries()) {
    for (const [index, figure] of row.figures.entries()) {
      const x = (index - (row.figures.length - 1) / 2) * .185;
      const y = .135 + (5 - rowIndex) * .49;
      const z = .12;
      const skin = figure.skin ?? "#ecc4a1";
      const accent = figure.accessory ?? "";
      add("cylinder", palette.ink, [x, y + .008, z], [.074, .016, .074]);
      for (const side of [-1, 1]) {
        add("box", figure.pants ?? palette.ink, [x + side * .026, y + .057, z], [.034, .08, .04]);
        add("sphere", skin, [x + side * .064, y + .135, z], [.022, .033, .022]);
        add("box", figure.outfit, [x + side * .052, y + .155, z], [.03, .055, .04], side * .3);
      }
      add("box", figure.outfit, [x, y + .13, z], [.095, .115, .055]);
      add("sphere", skin, [x, y + .245, z], [.069, .069, .057]);
      if (!["bald", "heisenberg", "antlers"].includes(accent)) {
        add("sphere", figure.hair, [x, y + .284, z - .012], [.072, .042, .059]);
        for (const side of [-1, 1]) add("box", figure.hair, [x + side * .057, y + .252, z - .014], [.023, .065, .07]);
      }
      for (const side of [-1, 1]) add("sphere", palette.ink, [x + side * .024, y + .247, z + .054], [.008, .011, .004]);
      add("box", "#bd826e", [x, y + .221, z + .056], [.015, .004, .003]);
      if (["spikes", "armor", "swords"].includes(accent)) for (let i = -2; i <= 2; i++) add("cone", figure.hair, [x + i * .024, y + .315 + (2 - Math.abs(i)) * .012, z - .012], [.027, .065, .035], -i * .3);
      if (["long-hair", "ponytail"].includes(accent)) add("sphere", figure.hair, [x, y + .21, z - .048], [.073, .1, .032]);
      if (["cloak", "blades", "cape"].includes(accent)) add("box", accent === "cape" ? palette.cream : "#536b4a", [x, y + .13, z - .038], [.125, .15, .02]);
      if (accent === "scarf") { add("box", "#b84648", [x, y + .19, z + .03], [.1, .025, .035]); add("box", "#b84648", [x + .04, y + .14, z + .04], [.025, .1, .014]); }
      if (["headband", "mask", "akatsuki"].includes(accent)) { add("box", palette.ink, [x, y + .275, z + .052], [.12, .024, .012]); add("box", "#bac6d2", [x, y + .275, z + .061], [.066, .02, .006]); }
      if (accent === "mask") add("box", "#384350", [x, y + .224, z + .055], [.094, .032, .014]);
      if (["glasses", "goggles", "heisenberg"].includes(accent)) for (const side of [-1, 1]) { add("box", palette.ink, [x + side * .026, y + .25, z + .061], [.04, .026, .006]); add("box", "#a6c5d1", [x + side * .026, y + .25, z + .066], [.027, .015, .003]); }
      if (["straw-hat", "cap", "fedora", "heisenberg", "top-hat", "antlers", "beanie"].includes(accent)) {
        const color = accent === "heisenberg" ? "#222832" : accent === "beanie" ? "#7f6556" : accent === "straw-hat" ? "#d6b16a" : accent === "antlers" ? "#e178a4" : accent === "cap" ? "#b3c8cf" : figure.outfit;
        add("cylinder", color, [x, y + .3, z], [.085, .012, .073]);
        add("cylinder", accent === "antlers" ? "#6ea2bb" : color, [x, y + (accent === "top-hat" ? .35 : .325), z], [.059, accent === "top-hat" ? .09 : .04, .052]);
        if (accent === "straw-hat") add("cylinder", "#b74c45", [x, y + .311, z], [.061, .014, .055]);
        if (accent === "antlers") { add("box", palette.cream, [x, y + .325, z + .057], [.035, .009, .008]); add("box", palette.cream, [x, y + .325, z + .057], [.009, .035, .008]); for (const side of [-1, 1]) add("box", "#ac8256", [x + side * .087, y + .335, z], [.018, .08, .018], side * -.45); }
      }
      if (["sword", "swords", "blades", "bat"].includes(accent)) {
        const count = accent === "swords" ? 3 : accent === "blades" ? 2 : 1;
        for (let i = 0; i < count; i++) add("box", accent === "bat" ? "#9f7852" : "#c7d6df", [x + .077 + i * .011, y + .14, z], [.009, .21, .013], -.2);
      }
      if (figure.name === "Luffy") { add("box", skin, [x, y + .145, z + .035], [.035, .085, .008]); add("box", "#e3bc58", [x, y + .081, z + .033], [.1, .02, .01]); }
      if (figure.name === "Nami") add("box", skin, [x, y + .106, z + .033], [.083, .04, .009]);
      if (figure.name === "Usopp") { add("cylinder", "#e4ddc9", [x, y + .304, z], [.083, .013, .075]); add("cylinder", "#e4ddc9", [x, y + .325, z], [.059, .035, .052]); }
      if (figure.name === "Walter White") { add("box", "#67523e", [x, y + .215, z + .056], [.043, .02, .006]); add("box", skin, [x, y + .222, z + .06], [.025, .011, .005]); }
      if (accent === "armor") add("box", palette.cream, [x, y + .15, z + .033], [.085, .075, .014]);
      if (accent === "suit") add("box", "#d4b576", [x, y + .155, z + .032], [.015, .072, .007]);
      if (accent === "cyborg") for (const side of [-1, 1]) add("sphere", "#ca544b", [x + side * .065, y + .17, z], [.037, .039, .037]);
      if (accent === "kimono") add("box", "#d7b66c", [x, y + .14, z + .033], [.016, .12, .008], -.4);
      if (accent === "akatsuki") add("sphere", "#be4755", [x, y + .14, z + .035], [.028, .016, .008]);
      if (accent === "gourd") add("sphere", "#b99966", [x + .065, y + .12, z - .035], [.046, .078, .04]);
      if (accent === "waffle") add("box", "#d7b66c", [x + .07, y + .14, z + .025], [.04, .04, .01]);
      if (accent === "walkie") add("box", palette.ink, [x + .07, y + .15, z + .025], [.025, .07, .02]);
      if (accent === "skateboard") add("box", "#8ba9bd", [x + .08, y + .12, z], [.035, .2, .012], .2);
    }
  }
  for (const batch of batches.values()) {
    const mesh = new THREE.InstancedMesh(shapes[batch.shape], new THREE.MeshStandardMaterial({ color: batch.color, roughness: .65 }), batch.matrices.length);
    batch.matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
    mesh.castShadow = true; mesh.receiveShadow = true; cabinet.add(mesh);
  }
  // The door is subtle enough to keep the actual 3D figures visible.
  const glass = new THREE.Mesh(new THREE.BoxGeometry(1.9, 2.9, .015), new THREE.MeshPhysicalMaterial({ color: palette.teal, transparent: true, opacity: .045, roughness: .08, depthWrite: false }));
  glass.position.set(0, 1.58, .31); cabinet.add(glass);
  for (const x of [-.035, .035]) box(cabinet, [.012, .19, .035], [x, 1.5, .34], palette.cream, .003);
};
