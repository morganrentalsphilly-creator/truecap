/** Vitest stand-in for the `server-only` package (see vitest.config.ts).
 *  The real package throws when imported outside React Server Components —
 *  correct for the Next build, wrong for unit tests of pure server logic. */
export {};
