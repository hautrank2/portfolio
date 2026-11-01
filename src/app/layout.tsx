import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import { ClickBurst } from "~/components/layouts/click-burst";
import Footer from "~/components/layouts/footer";
import Header from "~/components/layouts/header";
import { SiteFrame } from "~/components/layouts/site-frame";
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
          <SiteFrame
            header={<Header />}
            footer={<Footer />}
            effects={<ClickBurst />}
          >
            {children}
          </SiteFrame>
        </ThemeProvider>
      </body>
    </html>
  );
}
