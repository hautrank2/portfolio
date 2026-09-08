"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

export type ThemeProviderProps = React.ComponentProps<typeof NextThemesProvider>;

/**
 * Thin pass-through so the root layout stays a Server Component — next-themes'
 * provider is client-only and would otherwise drag `layout.tsx` across the
 * boundary with it.
 */
const ThemeProvider = ({ children, ...props }: ThemeProviderProps) => {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
};

export { ThemeProvider };
