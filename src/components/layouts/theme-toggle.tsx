"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

export type ThemeToggleProps = {
  className?: string;
};

/**
 * Sáng / tối.
 *
 * Hai icon cùng nằm trong nút, đổi chỗ bằng CSS `dark:` chứ không bằng state.
 * next-themes đặt class `dark` lên `<html>` bằng một script chạy trước khi React
 * hydrate, nên icon đúng ngay từ khung hình đầu — không cần cờ `mounted`, không
 * nháy sai icon, và không lệch hydration.
 */
const ThemeToggle = ({ className }: ThemeToggleProps) => {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      // Nhãn tĩnh: nhãn đổi theo theme sẽ lệch giữa server và client, vì server
      // không biết người đọc đang để theme nào.
      aria-label="Đổi giao diện sáng/tối"
      title="Đổi giao diện sáng/tối"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className={cn(
        "surface relative size-9 rounded-full border border-border/60 text-foreground/70 hover:text-foreground",
        className
      )}
    >
      <Sun
        size={16}
        className="rotate-0 scale-100 transition-transform duration-300 dark:-rotate-90 dark:scale-0"
      />
      <Moon
        size={16}
        className="absolute rotate-90 scale-0 transition-transform duration-300 dark:rotate-0 dark:scale-100"
      />
    </Button>
  );
};

export { ThemeToggle };
