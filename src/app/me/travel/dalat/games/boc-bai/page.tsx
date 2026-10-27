import type { Metadata } from "next";
import PartyGame from "./party-game";

export const metadata: Metadata = {
  title: "Đà Lạt | Bốc bài · Thật hay làm?",
  description: "88 lá bài nói thật, thử thách, drinking và thật hay làm cho một tối cùng hội bạn.",
  robots: { index: false, follow: false },
};
export default function Page() { return <PartyGame />; }
