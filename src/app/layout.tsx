import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import Footer from "~/components/layouts/footer";
import Header from "~/components/layouts/header";
import { profile } from "~/data/site";
import "./globals.css";

const sans = Nunito({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: `${profile.name} — ${profile.role}`,
    template: `%s — ${profile.name}`,
  },
  description: profile.tagline,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={sans.className}>
      <body className="dark antialiased">
        {/* Blurred gradient blob, parked behind everything. */}
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 -z-10 bg-[url(/svg/bg-gr.svg)] bg-[length:150vw_auto] bg-[-20vw_-60vh] bg-no-repeat opacity-60"
        />
        <Header />
        <main className="pt-16">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
