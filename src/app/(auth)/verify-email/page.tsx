import Link from "next/link";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const params = await searchParams;
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow text-center">
        <h1 className="mb-4 text-2xl font-bold text-gray-900">Verifica tu email</h1>
        {params.sent && (
          <p className="mb-4 text-gray-600">
            Te enviamos un enlace de confirmacion. Revisa tu bandeja de entrada y hace clic en
            el enlace para activar tu cuenta.
          </p>
        )}
        {params.error && (
          <p className="mb-4 text-red-600">
            El enlace es invalido o ya expiro. Solicita uno nuevo registrandote nuevamente.
          </p>
        )}
        <p className="text-sm text-gray-500">
          Ya verificaste?{" "}
          <Link href="/login" className="text-blue-600 hover:underline">
            Iniciar sesion
          </Link>
        </p>
      </div>
    </div>
  );
}
