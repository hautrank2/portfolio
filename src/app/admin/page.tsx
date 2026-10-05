"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { QueryStatus } from "./_components/query-status";

/** `/admin` has no screen of its own; it forwards to the first admin page. */
export default function AdminPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/logtime");
  }, [router]);

  return <QueryStatus />;
}
