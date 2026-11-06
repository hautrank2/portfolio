import type * as THREE from "three";

export type Vec3 = [number, number, number];

export type JointName =
  | "hips" | "spine" | "chest" | "neck" | "head"
  | "shoulderL" | "elbowL" | "wristL"
  | "shoulderR" | "elbowR" | "wristR";

export type CharacterJoints = Record<JointName, THREE.Object3D>;

export type CharacterPalette = {
  skin: THREE.ColorRepresentation;
  hair: THREE.ColorRepresentation;
  shirt: THREE.ColorRepresentation;
  pants: THREE.ColorRepresentation;
  shoe: THREE.ColorRepresentation;
  button: THREE.ColorRepresentation;
  frame: THREE.ColorRepresentation;
};

/**
 * Where an arm points, in chest space (+X = the character's left, +Y up,
 * +Z forward). The scene aims the shoulder so the upper arm runs along
 * `upper`, then the elbow so the forearm runs along `fore` — easier to write
 * and to blend than raw joint angles.
 */
export type ArmPose = { upper: Vec3; fore: Vec3 };

/** One resting pose of the body, reached when its section fills the screen. */
export type BodyPose = {
  /** -1 = left half of the screen, 0 = centre, 1 = right half. */
  side: number;
  /** Euler angles (x, y, z) in radians. The twist is spread over hips → head. */
  hips: Vec3;
  spine: Vec3;
  chest: Vec3;
  head: Vec3;
  /** The character's own left arm (screen right when facing the camera). */
  armL: ArmPose;
  armR: ArmPose;
  /** 0…1 — how much the right hand waves. */
  wave: number;
  /** Camera framing: 0 = head to belt, 1 = full body, shoes included. */
  shot: number;
};

export type PortraitSectionId = "intro" | "experience" | "projects" | "education" | "contact";

export type PortraitSection = {
  id: PortraitSectionId;
  /** Label of the HUD tick on the right edge. */
  label: string;
  pose: BodyPose;
  /** Where the panel sits; the character takes the other side. */
  panel: "left" | "right" | "bottom" | "none";
};

export type PortraitSceneOptions = {
  container: HTMLElement;
  poses: BodyPose[];
  onReady: () => void;
  onError: () => void;
};

export type PortraitPanelProps = {
  /** `01`, `02` … shown in the panel's title bar. */
  index: string;
  /** Fake file name in the title bar: `experience.log`. */
  file: string;
  title: string;
  children: React.ReactNode;
};
