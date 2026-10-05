import type { Metadata } from "next";

export const metadata: Metadata = {
  // The pages below are Client Components and cannot export their own title.
  title: "admin",
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
