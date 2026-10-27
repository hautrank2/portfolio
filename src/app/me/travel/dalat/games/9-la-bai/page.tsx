import type { Metadata } from "next";
import CardGame from "./card-game";

export const metadata: Metadata = {
  title: "Đà Lạt | 9 lá bài vui",
  description: "Chọn một lá bài, đố showbiz, đố mẹo, câu hỏi bựa và kiến thức dễ; nhận thử thách vui cùng hội bạn.",
  robots: { index: false, follow: false },
};

export default function Page() { return <CardGame />; }
