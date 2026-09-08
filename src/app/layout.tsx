import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import Footer from "~/components/layouts/footer";
import Header from "~/components/layouts/header";
import { ThemeProvider } from "~/components/layouts/theme-provider";
import { profileData, titlePrefixData } from "~/data/site";
import "./globals.css";

const sans = Nunito({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: titlePrefixData,
    template: `${titlePrefixData} | %s`,
  },
  description: profileData.tagline,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // next-themes ghi class lên <html> trước khi React hydrate — cảnh báo lệch
    // markup ở đây là dự kiến, không phải bug.
    <html lang="en" className={sans.className} suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          {/* Blurred gradient blob, parked behind everything. */}
          <div
            aria-hidden
            className="pointer-events-none fixed inset-0 -z-10 bg-[url(/svg/bg-gr.svg)] bg-[length:150vw_auto] bg-[-20vw_-60vh] bg-no-repeat opacity-30 dark:opacity-60"
          />
          <Header />
          <main className="pt-16">{children}</main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
