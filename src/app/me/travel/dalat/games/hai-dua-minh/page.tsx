import type { Metadata } from "next";
import CoupleGame from "./couple-game";
export const metadata: Metadata = {
  title: "Đà Lạt | Hai đứa mình",
  description: "Game dành riêng cho hai người yêu nhau: đoán ý, chia sẻ và thử thách tình cảm với 48 lá bài ngẫu nhiên.",
  robots: { index: false, follow: false },
};
export default function Page() { return <CoupleGame />; }
