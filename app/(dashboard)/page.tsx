import { redirect } from "next/navigation";

export default function DashboardRootPage() {
  // We'll eventually build a real dashboard here in Phase 11.
  // For now, redirect to the vehicles view to prevent a 404 on login.
  redirect("/vehicles");
}
