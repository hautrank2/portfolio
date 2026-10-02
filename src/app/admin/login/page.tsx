import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "~/lib/auth";
import { LoginForm } from "./_components/login-form";

export const metadata: Metadata = {
  title: "admin | login",
};

export default async function AdminLoginPage() {
  if (await getSession()) {
    redirect("/admin/logtime");
  }

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-sm flex-col justify-center px-4 py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
        Admin
      </p>
      <h1 className="mt-3 text-3xl font-extrabold">Đăng nhập</h1>
      <div className="surface mt-8 rounded-2xl border border-border/60 p-6">
        <LoginForm redirectTo="/admin/logtime" />
      </div>
    </div>
  );
}
