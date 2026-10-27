import type { Metadata } from "next";
import CircleGame from "./circle-game";
export const metadata: Metadata = {
  title: "Đà Lạt | Xoay vòng · Bí là uống",
  description: "Luân phiên nói một đáp án theo chủ đề, không được trùng. Ai bí, nói sai hoặc lặp thì nhận một ngụm.",
  robots: { index: false, follow: false },
};
export default function Page() { return <CircleGame />; }
