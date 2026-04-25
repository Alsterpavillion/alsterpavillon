// Vitest replacement for the `server-only` guard.
// In production builds the real package throws when imported from a client
// bundle. Tests run in jsdom (a client-like environment) but legitimately
// need to import server-side validation logic, so we stub it out here.
export {};
