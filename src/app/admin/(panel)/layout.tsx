"use client";

import { QueryStatus } from "~/app/admin/_components/query-status";
import { useApiQuery } from "~/hooks";
import type { SessionModel } from "~/types";
import { AdminSidebar } from "./_components/admin-sidebar";

/**
 * Everything signed-in sits in this group so it shares the sidebar; the login
 * page stays outside it. The parentheses keep the group out of the URL.
 *
 * Nothing is rendered until the session is confirmed — `useApiQuery` sends a
 * signed-out visitor to the login page. This is a courtesy, not the lock: the
 * API checks the session on every request.
 */
export default function AdminPanelLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = useApiQuery<{ user: SessionModel }>("/api/auth/me");

  if (!session.data) {
    return <QueryStatus error={session.error} />;
  }

  return (
    <div className="lg:flex">
      <AdminSidebar username={session.data.user.username} />
      <div className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
        {/* The one place the admin content width is set — pages fill it. */}
        <div className="mx-auto w-full max-w-[120rem]">{children}</div>
      </div>
    </div>
  );
}
