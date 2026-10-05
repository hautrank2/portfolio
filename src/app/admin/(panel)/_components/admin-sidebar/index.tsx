"use client";

import { Clock, FolderKanban, ListTodo, LogOut, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "~/components/ui/button";
import { adminNavData } from "~/data/admin";
import { cn } from "~/lib/utils";
import { useAdminSidebar } from "./hook";
import type { AdminSidebarProps } from "./type";

const NAV_ICONS: Record<string, LucideIcon> = {
  "/admin/projects": FolderKanban,
  "/admin/logtime": Clock,
  "/admin/tasks": ListTodo,
};

/** A rail beside the page on large screens, a bar above it on small ones. */
export const AdminSidebar = (props: AdminSidebarProps) => {
  const { username, isActive, handleSignOut } = useAdminSidebar(props);

  return (
    <aside className="border-b border-border/60 lg:w-60 lg:shrink-0 lg:border-r lg:border-b-0">
      <div className="flex items-center gap-2 px-4 py-3 sm:px-8 lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:flex-col lg:items-stretch lg:gap-6 lg:px-4 lg:py-10">
        <p className="hidden px-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary lg:block">
          Admin
        </p>

        <nav aria-label="Admin" className="min-w-0 flex-1">
          <ul className="flex gap-1 overflow-x-auto lg:flex-col">
            {adminNavData.map((item) => {
              const Icon = NAV_ICONS[item.href];
              const active = isActive(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-primary/15 text-primary"
                        : "text-foreground/70 hover:bg-foreground/5 hover:text-foreground"
                    )}
                  >
                    {Icon && <Icon className="size-4 shrink-0" />}
                    {item.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex shrink-0 items-center gap-2 lg:flex-col lg:items-stretch lg:border-t lg:border-border/60 lg:pt-4">
          <p className="hidden truncate px-3 text-xs text-muted-foreground lg:block">
            Signed in as{" "}
            <span className="font-medium text-foreground">{username}</span>
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="justify-start"
          >
            <LogOut />
            Sign out
          </Button>
        </div>
      </div>
    </aside>
  );
};
