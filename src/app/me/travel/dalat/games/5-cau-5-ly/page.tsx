import type { Metadata } from "next";
import TopicGame from "./topic-game";

export const metadata: Metadata = {
  title: "Đà Lạt | 5 câu, mấy ly?",
  description: "Chọn một chủ đề, trả lời 5 câu hỏi. Sai bao nhiêu câu, uống bấy nhiêu ly. Lần lượt cả hội cùng chơi!",
  robots: { index: false, follow: false },
};

export default function Page() { return <TopicGame />; }
