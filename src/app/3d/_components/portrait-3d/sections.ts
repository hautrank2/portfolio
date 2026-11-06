import type { ArmPose, BodyPose, PortraitSection } from "./type";

// Arm directions are in chest space: +X = his left, +Y up, +Z towards the camera.
const relaxedL: ArmPose = { upper: [0.16, -1, 0.02], fore: [0.08, -1, 0.18] };
const relaxedR: ArmPose = { upper: [-0.16, -1, 0.02], fore: [-0.08, -1, 0.18] };

// Arms folded: elbows a little out and forward, forearms across the chest.
// The left forearm rides on top and slightly in front of the right one.
const foldedL: ArmPose = { upper: [0.2, -0.76, 0.62], fore: [-0.95, 0.24, 0.2] };
const foldedR: ArmPose = { upper: [-0.2, -0.8, 0.56], fore: [0.96, 0.12, 0.12] };

// Open palm towards the panel on the left of the screen (his right).
const presentR: ArmPose = { upper: [-0.55, -0.78, 0.3], fore: [-0.72, -0.05, 0.69] };

// Hands clasped behind the back.
const behindL: ArmPose = { upper: [0.18, -0.9, -0.4], fore: [-0.62, -0.35, -0.6] };
const behindR: ArmPose = { upper: [-0.18, -0.9, -0.4], fore: [0.62, -0.35, -0.6] };

// Hand raised beside the head; the scene swings the forearm for the wave.
const raisedR: ArmPose = { upper: [-0.62, 0.62, 0.2], fore: [-0.15, 1, 0.1] };

const pose = (overrides: Partial<BodyPose>): BodyPose => ({
  side: 0,
  hips: [0, 0, 0],
  spine: [0, 0, 0],
  chest: [0, 0, 0],
  head: [0, 0, 0],
  armL: relaxedL,
  armR: relaxedR,
  wave: 0,
  shot: 0,
  ...overrides,
});

/**
 * The scroll choreography. The body is never spun as one block: each turn is
 * spread from the hips up to the head, and the arms are posed joint by joint.
 * Between two sections the poses blend, so folding the arms and turning
 * towards the panel happen as you scroll.
 */
export const portraitSections: PortraitSection[] = [
  {
    id: "intro", label: "Hello", panel: "none",
    pose: pose({ armR: raisedR, wave: 1, head: [0.02, 0, 0.06], chest: [0, 0, -0.03] }),
  },
  {
    id: "experience", label: "Experience", panel: "right",
    pose: pose({
      side: -1, armL: foldedL, armR: foldedR,
      hips: [0, 0.18, 0], spine: [0.02, 0.2, 0], chest: [0.03, 0.18, 0.02], head: [0.05, 0.32, 0.08],
    }),
  },
  {
    id: "projects", label: "Projects", panel: "left",
    pose: pose({
      side: 1, armR: presentR,
      hips: [0, -0.16, 0], spine: [0, -0.22, 0], chest: [-0.02, -0.22, -0.03], head: [-0.06, -0.3, -0.05],
    }),
  },
  {
    id: "education", label: "Education", panel: "right",
    pose: pose({
      side: -1, armL: behindL, armR: behindR, shot: 1,
      hips: [0, 0.12, 0], spine: [-0.03, 0.18, 0], chest: [-0.06, 0.16, 0], head: [-0.16, 0.3, 0.04],
    }),
  },
  {
    id: "contact", label: "Contact", panel: "bottom",
    pose: pose({ armL: foldedL, armR: raisedR, wave: 1, head: [0.04, 0, -0.05] }),
  },
];
