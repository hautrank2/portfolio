import * as THREE from "three";

import { art, box, canvasTexture, cylinder, palette, sphere } from "./objects";

const hanger = (parent: THREE.Group, at: number[]) => {
  const points = [new THREE.Vector3(-.33, -.12, 0), new THREE.Vector3(0, .11, 0), new THREE.Vector3(.33, -.12, 0), new THREE.Vector3(-.33, -.12, 0)];
  const curve = new THREE.CatmullRomCurve3(points, false, "catmullrom", 0);
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 14, .018, 5, false), new THREE.MeshStandardMaterial({ color: palette.cream }));
  mesh.position.set(at[0], at[1], at[2]); parent.add(mesh);
};

export const addKeepsakes = (root: THREE.Group) => {
  const coat = new THREE.Group(); coat.position.set(-3.91, 2.35, 2.3); coat.rotation.y = Math.PI / 2; coat.userData.spot = "life"; root.add(coat);
  hanger(coat, [0, .57, 0]);
  box(coat, [.54, .67, .13], [0, .06, .04], "#74784b", .055);
  for (const side of [-1, 1]) { const sleeve = box(coat, [.19, .55, .15], [side * .34, .1, .04], "#74784b", .04); sleeve.rotation.z = side * .22; }
  box(coat, [.64, .17, .16], [0, -.32, .025], "#526746", .025);
  const wings = canvasTexture(256, 300, ctx => {
    ctx.clearRect(0, 0, 256, 300);
    ctx.strokeStyle = "#d6dbd8"; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(28, 22); ctx.lineTo(228, 22); ctx.lineTo(218, 212); ctx.lineTo(128, 282); ctx.lineTo(38, 212); ctx.closePath(); ctx.stroke();
    for (const side of [-1, 1]) for (let i = 0; i < 9; i++) {
      ctx.fillStyle = side < 0 ? "#a9beca" : "#496d9b";
      ctx.strokeStyle = "#e9e8de"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(128 + side * 6, 242 - i * 11); ctx.lineTo(128 + side * (80 - i * 5), 194 - i * 17); ctx.lineTo(128 + side * (66 - i * 5), 176 - i * 17); ctx.lineTo(128 + side * 6, 216 - i * 13); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
  });
  art(coat, .33, .4, [0, .07, .116], wings.texture, false, false);
  for (const side of [-1, 1]) box(coat, [.025, .22, .02], [side * .21, -.07, .115], "#463a30", .004);

  const rack = new THREE.Group(); rack.position.set(3.46, 0, 2.15); rack.rotation.y = -.35; rack.userData.spot = "life"; root.add(rack);
  for (const x of [-.55, .55]) { cylinder(rack, .024, 2.35, [x, 1.23, 0], palette.cream); box(rack, [.1, .06, .56], [x, .1, 0], palette.side); }
  const rail = cylinder(rack, .025, 1.16, [0, 2.4, 0], palette.cream); rail.rotation.z = Math.PI / 2;
  hanger(rack, [-.08, 2.29, 0]);
  const gi = new THREE.Group(); gi.position.set(-.08, 1.8, .015); rack.add(gi);
  box(gi, [.49, .55, .12], [0, .04, 0], "#ed8239", .035);
  for (const side of [-1, 1]) { const sleeve = box(gi, [.22, .26, .15], [side * .31, .2, 0], "#ed8239", .025); sleeve.rotation.z = side * .37; box(gi, [.16, .4, .13], [side * .12, -.45, 0], "#ed8239", .035); box(gi, [.17, .08, .14], [side * .12, -.68, .01], "#31588a", .015); }
  box(gi, [.5, .07, .145], [0, -.18, .01], "#31588a", .01);
  const sash = box(gi, [.05, .22, .015], [.08, -.28, .09], "#31588a", .006); sash.rotation.z = -.2;
  const collar = new THREE.Mesh(new THREE.CircleGeometry(.16, 3), new THREE.MeshStandardMaterial({ color: "#31588a", side: THREE.DoubleSide })); collar.position.set(0, .24, .07); collar.rotation.z = Math.PI; gi.add(collar);
  const badge = canvasTexture(128, 128, ctx => { ctx.fillStyle = "#eee9d9"; ctx.beginPath(); ctx.arc(64, 64, 57, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = palette.ink; ctx.lineWidth = 6; ctx.stroke(); ctx.fillStyle = palette.ink; ctx.font = "bold 76px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("悟", 64, 65); });
  art(gi, .15, .15, [.12, .12, .075], badge.texture, false, false);
  const hat = new THREE.Group(); hat.position.set(.45, 2.18, .08); hat.rotation.set(.55, 0, -.25); rack.add(hat);
  cylinder(hat, .27, .035, [0, 0, 0], "#d6b16a"); cylinder(hat, .165, .12, [0, .07, 0], "#d6b16a"); cylinder(hat, .169, .038, [0, .037, 0], "#ad4542");
  for (let i = 0; i < 4; i++) { const ring = new THREE.Mesh(new THREE.TorusGeometry(.18 + i * .025, .003, 4, 28), new THREE.MeshStandardMaterial({ color: "#aa8b52" })); ring.rotation.x = Math.PI / 2; ring.position.y = .02; hat.add(ring); }

  const band = new THREE.Group(); band.position.set(1.34, .74, -2.22); band.rotation.set(-Math.PI / 2, 0, -.2); root.add(band);
  box(band, [.42, .13, .014], [0, 0, 0], "#293d61", .025);
  box(band, [.23, .115, .018], [0, 0, .016], "#aebdc7", .022);
  const leaf = canvasTexture(256, 128, ctx => {
    ctx.fillStyle = "#aebdc7"; ctx.fillRect(0, 0, 256, 128); ctx.strokeStyle = "#354351"; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(133, 64, 24, -.5, Math.PI * 1.65); ctx.bezierCurveTo(87, 34, 79, 76, 101, 95); ctx.lineTo(70, 90); ctx.lineTo(87, 73); ctx.moveTo(145, 43); ctx.lineTo(161, 23); ctx.moveTo(104, 80); ctx.lineTo(99, 108); ctx.stroke();
    for (const x of [18, 238]) for (const y of [26, 102]) { ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fillStyle = "#687985"; ctx.fill(); }
  });
  art(band, .225, .11, [0, 0, .027], leaf.texture, false, false);

  const corgi = new THREE.Group(); corgi.position.set(1.42, .15, 2.19); corgi.rotation.y = -.55; corgi.scale.setScalar(.62); corgi.userData.spot = "dog"; root.add(corgi);
  sphere(corgi, [.5, .22, .29], [0, .19, 0], "#be854c");
  sphere(corgi, [.28, .16, .27], [-.22, .19, .03], "#f0e3c9");
  sphere(corgi, [.24, .23, .22], [-.36, .22, .08], "#ca955c");
  sphere(corgi, [.09, .18, .025], [-.42, .24, .27], "#f3e9d6");
  sphere(corgi, [.15, .09, .13], [-.45, .12, .23], "#f3e9d6");
  sphere(corgi, [.04, .035, .025], [-.49, .14, .35], palette.ink);
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(.105, .24, 3), new THREE.MeshStandardMaterial({ color: "#bc8248" })); ear.position.set(-.34, .47, .08 + side * .16); ear.rotation.x = side * .22; corgi.add(ear);
    const pink = new THREE.Mesh(new THREE.ConeGeometry(.059, .145, 3), new THREE.MeshStandardMaterial({ color: "#dba49a" })); pink.position.set(-.34, .47, .105 + side * .16); corgi.add(pink);
    sphere(corgi, [.14, .06, .08], [-.27, .04, side * .2], "#f3e9d6");
    box(corgi, [.07, .012, .014], [-.46, .245, .19 + side * .072], palette.ink, .004);
  }
  sphere(corgi, [.09, .08, .08], [.46, .19, 0], "#f3e9d6");
  return corgi;
};
