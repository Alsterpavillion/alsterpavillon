import { LoginForm } from "./login-form";

type SearchParams = Promise<{ next?: string }>;

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : "/app";

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 p-6">
      <div className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold text-zinc-900">Alsterpavillon</h1>
        <p className="mb-6 text-sm text-zinc-500">Login per Magic Link</p>
        <LoginForm next={next} />
      </div>
    </main>
  );
}
