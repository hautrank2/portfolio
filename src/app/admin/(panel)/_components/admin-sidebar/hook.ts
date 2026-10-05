import { usePathname, useRouter } from "next/navigation";
import { requestJson } from "~/lib/api-client";
import type { UseAdminSidebarProps } from "./type";

export const useAdminSidebar = ({ username }: UseAdminSidebarProps) => {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  const handleSignOut = async () => {
    // Leave even if the request failed: the login page re-checks the session.
    await requestJson("/api/auth/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  };

  return { username, isActive, handleSignOut };
};
