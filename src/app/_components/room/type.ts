import type { Group } from "three";

export type RoomSpot = "about" | "collection" | "tech" | "life" | "dog" | "contact";
export type FigureSpec = { name: string; hair: string; outfit: string; skin?: string; pants?: string; accessory?: string };
export type RoomChapter = {
  id: "overview" | Exclude<RoomSpot, "dog">;
  label: string;
  subtitle: string;
  title: string;
  camera: [number, number, number];
  target: [number, number, number];
};
export type RoomDetailsProps = { selected: RoomSpot; tvOn: boolean; toggleTv: () => void };
export type RoomSceneOptions = {
  container: HTMLDivElement;
  onReady: () => void;
  onError: () => void;
  onSelect: (spot: RoomSpot) => void;
};
export type RoomPrint = { index: number; at: number[]; width: number; height: number; side: boolean };
export type RoomBuild = { root: Group; dog: Group; animate: (time: number, playing: boolean, reduced: boolean) => void };
