import "@testing-library/jest-dom/vitest";

// Provide deterministic ENV before any module under test is imported.
// These values are non-secret stubs; real values are only set in CI / Vercel.
process.env.NEXT_PUBLIC_SUPABASE_URL ??= "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "test-anon-key";
process.env.NEXT_PUBLIC_APP_URL ??= "http://localhost:3000";
process.env.SUPABASE_SERVICE_ROLE_KEY ??= "test-service-role-key";
// Vitest sets NODE_ENV=test automatically — no override needed.
