import { BLOG_DESCRIPTION, CHROME_STORE_URL } from '../config/site'

/**
 * The home page copy: the hero, and the sections that follow the playground.
 *
 * Out of the component because the build plugin bakes this text into the
 * prerendered body: a crawler that does not run scripts still needs the h1,
 * the pitch and the sections. That gives it the same isomorphic rules as the
 * page registry — plain data, relative imports, nothing Vite-only.
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

export interface HomeLink {
  href: string
  label: string
}

/** One titled paragraph inside a section: an h3, its text, and at most one link. */
export interface HomeItem {
  title: string
  text: string
  link?: HomeLink
}

export interface HomeSection {
  /** Anchor and class hook; unique across the page. */
  id: string
  /** The h2. */
  heading: string
  /** One paragraph under the heading, before the items. */
  intro?: string
  items: readonly HomeItem[]
}

/**
 * The sections below the playground, in reading order.
 *
 * Every number and claim here is repeated from somewhere that owns it — the
 * pricing data, the enhancement prompts, the privacy policy, the plugin README —
 * and should change when that does. The playground is described as "on this
 * page" rather than "above", because in the baked body there is no playground:
 * it only exists once the app boots.
 */
export const HOME_SECTIONS: readonly HomeSection[] = [
  {
    id: 'how',
    heading: 'How it works',
    intro:
      'Paste a draft and get back a prompt an AI model can act on. Koleslaw reads the shape of what you wrote and picks one of three strategies.',
    items: [
      {
        title: 'Expand',
        text: "A short, terse prompt gets the specifics a model would otherwise guess at: who it's for, the tone, how much detail, the output format, and the limits.",
      },
      {
        title: 'Refine',
        text: 'A prompt that already says enough gets tightened. Vague words become precise ones, filler goes, and the instructions that matter most move to the front. Your voice stays.',
      },
      {
        title: 'Structure',
        text: 'A long, rambling prompt gets reorganized so it can be skimmed: the objective first, then context, requirements, and output format. Nothing you asked for is dropped.',
      },
    ],
  },
  {
    id: 'where',
    heading: 'Where it works',
    intro: 'One API behind every client. Use whichever is closest to where you write prompts.',
    items: [
      {
        title: 'The playground on this page',
        text: 'Free, no account, 10 enhances a day. Paste, enhance, copy.',
      },
      {
        title: 'Chrome extension',
        text: 'On ChatGPT, Claude, and Gemini, a floating button rewrites the draft in the prompt box in place. The popup handles every other site: paste, enhance, copy.',
        link: { href: CHROME_STORE_URL, label: 'Get it on the Chrome Web Store' },
      },
      {
        title: 'Claude Code',
        text: 'A plugin that adds a /koleslaw:enhance command and a skill Claude Code picks up from plain language, so a half-formed request gets rewritten before it runs.',
        link: { href: 'https://github.com/thunkaboutit/koleslaw-claude-code', label: 'Plugin on GitHub' },
      },
      {
        title: 'The API',
        text: 'Streaming and synchronous endpoints behind an API key, with the strategy on auto or set explicitly per request. The server is open source.',
        link: { href: 'https://github.com/thunkaboutit/koleslaw-api', label: 'API on GitHub' },
      },
    ],
  },
  {
    id: 'model',
    heading: 'What runs it',
    items: [
      {
        title: 'Our own fine-tuned model',
        text: "Koleslaw is served by a 31.6B-parameter fine-tune of NVIDIA's Nemotron, trained for prompt enhancement and run on a single GPU in AWS. The weights are public.",
        link: {
          href: 'https://huggingface.co/thunkaboutit/Koleslaw-Nemotron-30B-A3B-PromptEnhance',
          label: 'Open weights on Hugging Face',
        },
      },
      {
        title: 'Built in the open',
        text: BLOG_DESCRIPTION,
        link: { href: '/blog', label: 'Read the Koleslaw Blog' },
      },
    ],
  },
  {
    id: 'faq',
    heading: 'Questions',
    items: [
      {
        title: 'Is Koleslaw free?',
        text: 'The playground is free with no account: 10 enhances a day. A free account gets 50 a day per API key. Pro is $10 a month for 500.',
        link: { href: '/pricing', label: 'Pricing' },
      },
      {
        title: "Will it change what I'm asking for?",
        text: 'No. Every strategy is instructed to preserve your intent and your tone. It adds what a model would otherwise have to guess, or tightens and reorganizes what you wrote.',
      },
      {
        title: 'Do I have to pick a strategy?',
        text: 'No. Koleslaw picks expand, refine, or structure from the length and shape of your draft. The API lets you name one explicitly.',
      },
      {
        title: 'What happens to my prompt?',
        text: 'It goes to the Koleslaw API, gets enhanced, and comes back. It may be cached for up to 24 hours so a repeat comes back fast, then it is purged. It is never used to train a model.',
        link: { href: '/privacy', label: 'Privacy policy' },
      },
    ],
  },
]
