"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Truck, Users, LogOut, LayoutDashboard, Map, Wrench, Wallet, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

import { ThemeToggle } from "@/components/theme-toggle";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Trips", href: "/trips", icon: Map },
  { name: "Maintenance", href: "/maintenance", icon: Wrench },
  { name: "Finances", href: "/fuel-expenses", icon: Wallet },
  { name: "Vehicles", href: "/vehicles", icon: Truck },
  { name: "Drivers", href: "/drivers", icon: Users },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <div className="flex h-screen bg-gray-50/50 dark:bg-background">
      {/* Sidebar */}
      <div className="w-64 border-r bg-white dark:bg-card flex flex-col shadow-sm hidden md:flex">
        <div className="h-16 flex items-center justify-between px-6 border-b">
          <span className="font-bold text-xl text-primary flex items-center gap-2">
            <Truck className="h-5 w-5" /> TransitOps
          </span>
          <ThemeToggle />
        </div>
        <div className="flex-1 py-6 px-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname.startsWith(item.href) && (item.href !== "/" || pathname === "/");
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            );
          })}
          {session?.user?.role !== "DISPATCHER" && (
            <Link
              href={session?.user?.role === "SAFETY_OFFICER" ? "/reports/compliance" : "/reports"}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                pathname.startsWith("/reports")
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <BarChart3 className="h-4 w-4" />
              Reports
            </Link>
          )}
        </div>
        <div className="p-4 border-t">
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-red-50 dark:hover:bg-red-950/50 hover:text-red-600 dark:hover:text-red-500 transition-all duration-200 w-full"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="bg-white dark:bg-card border-b h-16 flex md:hidden items-center justify-between px-6 shadow-sm">
          <div className="font-bold text-xl text-primary flex items-center gap-2">
            <Truck className="h-5 w-5" /> TransitOps
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button onClick={() => signOut({ callbackUrl: "/login" })} className="p-2 text-muted-foreground hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
