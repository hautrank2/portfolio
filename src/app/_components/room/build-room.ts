import * as THREE from "three";

import { addFigureCabinet } from "./figures";
import { addKeepsakes } from "./keepsakes";
import { roomTechnologies } from "./tech";

import { art, box, canvasTexture, cylinder, label, palette, plant, sphere } from "./objects";
import type { RoomBuild, RoomPrint } from "./type";

export const buildRoom = (): RoomBuild => {
  const root = new THREE.Group();
  // The open front and right side keep every area readable from the default camera.
  box(root, [8.4, .28, 6.4], [0, -.14, 0], palette.darkWood, .07);
  for (let x = 0; x < 18; x++) for (let z = 0; z < 4; z++) {
    box(root, [.45, .055, 1.54], [-3.83 + x * .45, .015, -2.34 + z * 1.56], new THREE.Color(palette.side).multiplyScalar(1 + (x + z * 3) % 4 * .12).getStyle(), .005);
  }
  box(root, [8.25, 3.8, .16], [0, 1.9, -3.1], palette.wall);
  // A real opening in the left wall, rather than a window pasted onto a solid wall.
  box(root, [.16, 3.8, 1.15], [-4.08, 1.9, -2.58], palette.side);
  box(root, [.16, 3.8, 1.7], [-4.08, 1.9, 2.3], palette.side);
  box(root, [.16, 1.04, 3.35], [-4.08, .52, -.35], palette.side);
  box(root, [.16, .55, 3.35], [-4.08, 3.525, -.35], palette.side);
  box(root, [8.1, .14, .09], [0, .12, -2.99], palette.cream);
  box(root, [.09, .14, 6.15], [-3.97, .12, 0], palette.cream);

  const sky = canvasTexture(512, 512, ctx => {
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, palette.ink); gradient.addColorStop(1, palette.side);
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 512, 512);
    ctx.fillStyle = palette.cream; ctx.beginPath(); ctx.arc(345, 150, 29, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = palette.ink; ctx.beginPath(); ctx.arc(356, 141, 26, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 42; i++) { ctx.fillStyle = i % 3 ? palette.cream : palette.teal; ctx.fillRect((i * 137) % 512, (i * 73) % 270, i % 4 ? 1 : 2, i % 4 ? 1 : 2); }
    for (let i = 0; i < 19; i++) {
      const top = 310 + (i * 73) % 110;
      ctx.fillStyle = i % 2 ? palette.wall : palette.ink; ctx.fillRect(i * 31, top, 28, 240);
      for (let j = 0; j < 4; j++) { ctx.fillStyle = palette.teal; ctx.fillRect(i * 31 + 7, top + 14 + j * 22, 3, 5); }
    }
  });
  const city = sky.canvas.getContext("2d");
  if (city) {
    const steps = [260, 230, 194, 166, 137, 108, 83, 108, 150, 190, 225];
    for (const [index, top] of steps.entries()) {
      const x = 180 + index * 11;
      const gradient = city.createLinearGradient(x, 0, x + 10, 0); gradient.addColorStop(0, palette.wall); gradient.addColorStop(.65, palette.side); gradient.addColorStop(1, palette.teal);
      city.fillStyle = gradient; city.fillRect(x, top, 10, 512 - top);
      city.fillStyle = palette.teal; city.globalAlpha = .7;
      for (let y = top + 5; y < 512; y += 7) city.fillRect(x + 2, y, 6, 1);
      city.globalAlpha = 1;
    }
    city.fillStyle = palette.cream; city.fillRect(249, 40, 2, 48); city.fillStyle = palette.teal; city.fillRect(246, 83, 8, 10);
    sky.texture.needsUpdate = true;
  }
  art(root, 3.27, 2.16, [-4.1, 2.14, -.35], sky.texture, true, false);
  for (const z of [-2.04, 1.34]) box(root, [.2, 2.32, .09], [-4, 2.14, z], palette.cream);
  for (const y of [1, 3.28]) box(root, [.2, .1, 3.48], [-4, y, -.35], palette.cream);
  box(root, [.14, 2.2, .055], [-3.96, 2.14, -.35], palette.cream);
  box(root, [.14, .055, 3.3], [-3.96, 2.22, -.35], palette.cream);
  box(root, [.43, .1, 3.7], [-3.92, 1.02, -.35], palette.cream);
  for (const z of [-2.08, 1.42]) {
    for (let i = 0; i < 5; i++) cylinder(root, .065, 2.6, [-3.76 + (i % 2) * .05, 2.03, z + i * .085], palette.wall);
  }

  // Developer desk faces the window. Screens face into the room.
  const desk = new THREE.Group(); desk.position.set(-3.15, 0, -.3); desk.rotation.y = Math.PI / 2; desk.userData.spot = "tech"; root.add(desk);
  box(desk, [2.7, .12, 1.15], [0, 1.16, 0], palette.wood);
  for (const x of [-1.15, 1.15]) for (const z of [-.43, .43]) box(desk, [.09, 1.08, .09], [x, .56, z], palette.ink);
  box(desk, [.82, .035, .4], [-.1, 1.25, .2], palette.ink);
  box(desk, [.26, .04, .19], [.36, 1.255, -.29], palette.ink);
  box(desk, [.055, .38, .07], [.36, 1.43, -.29], palette.ink);
  box(desk, [1.17, .69, .06], [.36, 1.86, -.28], palette.ink);
  const code = canvasTexture(768, 448, ctx => {
    ctx.fillStyle = palette.ink; ctx.fillRect(0, 0, 768, 448); ctx.fillStyle = palette.side; ctx.fillRect(0, 0, 768, 45);
    ctx.font = "19px monospace"; ctx.fillStyle = palette.cream; ctx.fillText("~/hautrank2  •  room.tsx", 26, 29);
    ["const developer = {", "  name: 'Hau Tran',", "  role: 'Frontend developer',", "  stack: ['React', 'Next.js'],", "  loves: ['code', 'football'],", "  always: 'learning'", "};", "", "// make yourself at home."].forEach((line, i) => { ctx.fillStyle = [palette.teal, palette.cream, palette.teal][i % 3]; ctx.fillText(line, 42, 91 + i * 35); });
  });
  const projectScreen = art(desk, 1.09, .61, [.36, 1.86, -.242], code.texture, false, false); projectScreen.userData.spot = "tech";
  const laptop = new THREE.Group(); laptop.position.set(-.91, 1.24, .09); laptop.rotation.y = .12; desk.add(laptop);
  box(laptop, [.62, .035, .45], [0, .01, 0], palette.side);
  box(laptop, [.63, .43, .025], [0, .235, -.2], palette.side);
  art(laptop, .56, .36, [0, .235, -.183], code.texture, false, false);
  for (let row = 0; row < 4; row++) for (let col = 0; col < 9; col++) box(laptop, [.041, .005, .035], [-.245 + col * .06, .03, -.12 + row * .05], palette.ink, .002);
  for (let row = 0; row < 4; row++) for (let col = 0; col < 13; col++) box(desk, [.042, .016, .043], [-.45 + col * .055, 1.275, .09 + row * .055], palette.cream, .003);
  sphere(desk, [.065, .035, .09], [.53, 1.27, .2], palette.cream);
  cylinder(desk, .08, .15, [1.05, 1.3, .27], palette.cream);
  plant(desk, [1.05, 1.23, -.29], .65);
  cylinder(root, .39, .12, [-1.98, .67, -.25], palette.side);
  box(root, [.12, .62, .12], [-1.98, .33, -.25], palette.ink);
  const chairBack = box(root, [.12, .7, .72], [-1.63, 1.05, -.25], palette.side, .08); chairBack.rotation.z = -.1;
  for (let i = 0; i < 5; i++) { const a = i * Math.PI * .4; const leg = box(root, [.47, .05, .05], [-1.98 + Math.cos(a) * .18, .08, -.25 + Math.sin(a) * .18], palette.ink); leg.rotation.y = -a; }

  const bed = new THREE.Group(); bed.userData.spot = "about"; root.add(bed);
  box(bed, [2.05, .3, 2.95], [2.6, .26, -1.18], palette.wood, .08);
  box(bed, [2.12, 1.1, .15], [2.6, .73, -2.66], palette.darkWood, .04);
  box(bed, [1.99, .26, 2.8], [2.6, .51, -1.15], palette.cream, .12);
  box(bed, [2, .17, 1.72], [2.6, .71, -.64], palette.teal, .08);
  for (let i = 0; i < 7; i++) box(bed, [.018, .008, 1.63], [1.77 + i * .27, .799, -.61], palette.cream, .003);
  for (const x of [2.08, 3.1]) box(bed, [.85, .19, .56], [x, .75, -2.13], palette.cream, .09);
  box(bed, [2.03, .07, .55], [2.6, .82, .01], palette.side, .03);
  box(root, [.7, .67, .65], [1.12, .37, -2.43], palette.wood);
  box(root, [.56, .22, .035], [1.12, .44, -2.09], palette.darkWood);
  cylinder(root, .12, .04, [1.12, .75, -2.43], palette.brass);
  cylinder(root, .024, .35, [1.12, .94, -2.43], palette.brass);
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(.16, .25, .28, 24), new THREE.MeshStandardMaterial({ color: palette.cream, emissive: palette.teal, emissiveIntensity: .7 })); shade.position.set(1.12, 1.16, -2.43); root.add(shade);

  // A compact media cabinet leaves a clear path across the front of the room.
  const tv = new THREE.Group(); tv.position.set(2.4, 0, 1.1); tv.rotation.y = Math.PI; tv.userData.spot = "tech"; root.add(tv);
  box(tv, [2.35, .48, .67], [0, .36, 0], palette.wood, .04);
  for (const x of [-.8, .8]) for (const z of [-.22, .22]) box(tv, [.09, .16, .09], [x, .08, z], palette.darkWood);
  for (const x of [-.78, 0, .78]) box(tv, [.72, .29, .04], [x, .37, .345], palette.darkWood);
  for (const x of [-.7, .7]) { const foot = box(tv, [.08, .25, .25], [x, .7, 0], palette.ink); foot.rotation.z = x > 0 ? -.2 : .2; }
  box(tv, [1.95, 1.12, .085], [0, 1.28, -.04], palette.ink, .035);
  const screen = canvasTexture(960, 540, () => undefined);
  art(tv, 1.83, 1.005, [0, 1.28, .008], screen.texture, false, false);
  const logos = roomTechnologies.map(technology => {
    const image = new Image(); image.src = `/img/room/tech/${technology.file}.svg`;
    return { ...technology, image };
  });
  let lastTvFrame = -1;
  const animate = (time: number, playing: boolean, reduced: boolean) => {
    const tick = Math.floor(time / 300); if (tick === lastTvFrame) return; lastTvFrame = tick;
    const ctx = screen.canvas.getContext("2d"); if (!ctx) return;
    ctx.fillStyle = palette.ink; ctx.fillRect(0, 0, 960, 540);
    if (playing) {
      ctx.fillStyle = palette.cream; ctx.font = "bold 30px sans-serif"; ctx.fillText("HAU TRAN / TOOLKIT", 35, 48);
      ctx.fillStyle = palette.teal; ctx.fillRect(35, 66, 890, 2);
      for (const [index, technology] of logos.entries()) {
        const x = 42 + index % 5 * 182; const y = 98 + Math.floor(index / 5) * 143;
        ctx.globalAlpha = reduced ? 1 : .78 + Math.sin(time * .001 + index) * .2;
        if (technology.image.complete && technology.image.naturalWidth) ctx.drawImage(technology.image, x + 45, y, 72, 72);
        ctx.globalAlpha = 1; ctx.fillStyle = palette.cream; ctx.font = "24px sans-serif"; ctx.textAlign = "center"; ctx.fillText(technology.name, x + 81, y + 105); ctx.textAlign = "left";
      }
    }
    screen.texture.needsUpdate = true;
  };
  box(tv, [.18, .7, .39], [1.48, .95, -.04], palette.ink, .055);
  for (const x of [1.35, 1.61]) { const panel = box(tv, [.065, .77, .44], [x, .96, -.04], palette.cream, .035); panel.rotation.z = x < 1.5 ? -.07 : .07; }
  box(tv, [.013, .52, .016], [1.39, .96, .19], palette.teal, .003);
  const pad = box(tv, [.4, .06, .23], [.83, .66, .06], palette.cream, .06);
  for (const x of [-.12, .12]) sphere(pad, [.075, .05, .07], [x, .01, .05], palette.ink);

  // Collectible prints use one local atlas to avoid eight image requests.
  const prints: RoomPrint[] = [];
  const print = (index: number, at: number[], width: number, height: number, side = false) => {
    prints.push({ index, at, width, height, side });
  };
  for (let i = 0; i < 3; i++) print(i, [-3.2 + i * .78, 2.94, -2.99], .59, .79);
  new THREE.TextureLoader().load("/img/room/posters.webp", atlas => {
    atlas.colorSpace = THREE.SRGBColorSpace;
    for (const { index, at, width, height, side } of prints) {
      const map = atlas.clone(); map.repeat.set(.25, .5); map.offset.set((index % 4) * .25, index < 4 ? .5 : 0);
      const group = art(root, width, height, at, map, side); group.userData.spot = "life";
    }
    atlas.dispose();
  });
  new THREE.TextureLoader().load("/img/room/luffy-gear-five-reference.png", source => {
    source.colorSpace = THREE.SRGBColorSpace;
    const panels = [ [47, 365, 179, 297], [234, 306, 177, 414], [420, 276, 176, 473], [607, 306, 177, 414], [794, 365, 176, 297] ];
    for (const [index, [x, y, width, height]] of panels.entries()) {
      const texture = source.clone(); texture.repeat.set(width / 1024, height / 1024); texture.offset.set(x / 1024, 1 - (y + height) / 1024);
      const panelHeight = height / 473 * 1.25;
      art(root, .33, panelHeight, [1.83 + index * .37, 2.68, -2.99], texture);
    }
    source.dispose();
  });
  label(root, "MAKE. LEARN. REPEAT.", 1.65, .3, [-1.94, 1.84, -2.99]);
  box(root, [1.65, .38, .29], [-.1, 3.43, -2.84], palette.cream, .07);
  box(root, [1.4, .035, .16], [-.1, 3.27, -2.7], palette.side, .005);
  sphere(root, [.018, .018, .008], [.56, 3.42, -2.687], palette.teal);
  box(root, [1.1, .08, .35], [-2.8, 1.5, -2.82], palette.wood);
  for (let i = 0; i < 6; i++) { const book = box(root, [.1, .31 + i % 3 * .04, .23], [-3.17 + i * .135, 1.7, -2.82], [palette.teal, palette.cream, palette.side][i % 3]); book.rotation.z = i === 5 ? -.15 : 0; }
  plant(root, [-3.38, .05, 2.35], 1.6);
  plant(root, [3.82, .05, -.1], 1.1);

  const rug = cylinder(root, .82, .035, [1.42, .09, 2.19], palette.side); rug.scale.z = .77;
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.6 + i * .08, .009, 5, 64), new THREE.MeshStandardMaterial({ color: palette.teal })); ring.rotation.x = Math.PI / 2; ring.scale.y = .77; ring.position.set(1.42, .113, 2.19); root.add(ring);
  }
  addFigureCabinet(root);
  const dog = addKeepsakes(root);
  // Coffee, a football and a little stack of games make the room feel lived in.
  const football = sphere(root, [.23, .23, .23], [3.2, .29, .91], palette.cream);
  for (let i = 0; i < 7; i++) sphere(football, [.24, .24, .025], [Math.sin(i * 2.4) * .68, Math.cos(i * 2.4) * .68, .75], palette.ink);
  for (let i = 0; i < 3; i++) box(root, [.37, .045, .3], [-1.8, .08 + i * .05, 2.24], [palette.teal, palette.cream, palette.side][i]);

  return { root, dog, animate };
};
