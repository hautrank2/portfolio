import type { Metadata } from "next";

import { Portrait3d } from "./_components/portrait-3d";

export const metadata: Metadata = {
  title: "3d",
  description: "A 3D portrait that turns as you scroll — experience, projects, education and contact.",
};

export default function Portrait3dPage() {
  return <Portrait3d />;
}
