import type { Metadata } from "next";
import SecretsGame from "./secrets-game";
export const metadata: Metadata = {
  title: "Đà Lạt | Bí mật khó nói",
  description: "60 lá bài về bản thân, bí mật và những điều khó thú nhận. Nói thật hoặc uống để qua lượt.",
  robots: { index: false, follow: false },
};
export default function Page() { return <SecretsGame />; }
