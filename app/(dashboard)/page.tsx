import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="bg-white p-8 rounded-lg shadow-sm border max-w-xl">
      <h1 className="text-2xl font-semibold mb-4">Dashboard Verification</h1>
      <p className="text-gray-700">Logged in as: <strong>{session.user.email}</strong></p>
      <p className="text-gray-700 mt-2">Role: <span className="inline-block bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded font-medium">{session.user.role}</span></p>
    </div>
  );
}
