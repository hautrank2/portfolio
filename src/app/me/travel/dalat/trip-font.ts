import localFont from "next/font/local";

export const tripFont = localFont({
  src: [
    { path: "../../../../assets/fonts/BeVietnamPro-Regular.ttf", weight: "400", style: "normal" },
    { path: "../../../../assets/fonts/BeVietnamPro-Medium.ttf", weight: "500", style: "normal" },
    { path: "../../../../assets/fonts/BeVietnamPro-SemiBold.ttf", weight: "600", style: "normal" },
    { path: "../../../../assets/fonts/BeVietnamPro-Bold.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-trip",
  display: "swap",
});
