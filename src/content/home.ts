/**
 * The home page hero copy.
 *
 * Out of the component because the build plugin bakes this text into the
 * prerendered body: a crawler that does not run scripts still needs the h1 and
 * the pitch. That gives it the same isomorphic rules as the page registry —
 * plain data, relative imports, nothing Vite-only.
 */

export interface HomeHero {
  /** One entry per visual line of the h1. */
  headline: readonly string[]
  subtitle: string
  cta: { label: string; note: string }
}

export const HOME_HERO: HomeHero = {
  headline: ['Stop Re-prompting.', 'Start Kolewoofing.'],
  subtitle:
    "Koleslaw takes your rough prompt and turns it into exactly what AI needs to hear. Better input, better output — it's not rocket science. It's a barking cow.",
  cta: {
    label: 'Get the Chrome extension',
    note: 'Enhance in place on ChatGPT, Claude, and Gemini.',
  },
}
