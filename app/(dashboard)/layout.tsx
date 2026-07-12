"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b h-16 flex items-center justify-between px-6 shadow-sm">
        <div className="font-bold text-xl text-primary">TransitOps</div>
        <Button variant="outline" onClick={() => signOut({ callbackUrl: "/login" })}>Sign Out</Button>
      </header>
      <main className="flex-1 p-6">
        {children}
      </main>
    </div>
  );
}
