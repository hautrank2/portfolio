import { usePathname } from "next/navigation";

export const useSiteFrame = () => {
  const pathname = usePathname();
  return { standalone: pathname === "/me/travel/dalat" || pathname.startsWith("/me/travel/dalat/") };
};
