import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <LogoutButton />
        </div>
        <p className="text-gray-600">
          Bienvenido, {session.user.name}. Tu cuenta esta configurada correctamente.
        </p>
        <p className="text-sm text-gray-400 mt-2">
          Phase 2: conexion con MercadoLibre — proximamente.
        </p>
      </div>
    </div>
  );
}
