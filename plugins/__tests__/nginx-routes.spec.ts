import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { assert, describe, it } from 'vitest'
import router from '@/router'

/**
 * nginx has no way to ask the router what the app serves, so
 * nginx.conf.template repeats the route list: those URLs fall back to the SPA
 * shell, everything else now gets a real 404. That makes a forgotten route a
 * dead page in production rather than a cosmetic slip, and nothing in the build
 * would catch it. This spec is the tripwire.
 */

const TEMPLATE = join(import.meta.dirname, '../../nginx.conf.template')
const KNOWN_ROUTES = /location\s+~\s+\^\/\(([^)]+)\)\$/

const FIX = [
  'nginx and the router disagree about which paths exist.',
  'Edit the `location ~ ^/(...)$` alternation in nginx.conf.template so it lists',
  'every non-dynamic router path except "/", which has its own `location = /`.',
  'A path missing from nginx serves a 404; a stale one serves the shell forever.',
].join(' ')

function nginxPaths(): string[] {
  const alternation = KNOWN_ROUTES.exec(readFileSync(TEMPLATE, 'utf8'))?.[1]

  if (alternation === undefined) {
    throw new Error(`nginx.conf.template has no known-route location. ${FIX}`)
  }

  return ['/', ...alternation.split('|').map((name) => `/${name}`)].sort()
}

// Dynamic paths are excluded: nginx answers /blog/<slug> from the baked file or
// a 404, so it never needs to know the pattern.
function routerPaths(): string[] {
  return router
    .getRoutes()
    .map((route) => route.path)
    .filter((candidate) => !candidate.includes(':'))
    .sort()
}

describe('nginx known routes', () => {
  it('lists exactly the routes the app answers', () => {
    // assert rather than expect: the diff alone would leave whoever added a
    // route guessing, and this message is the whole point of the check.
    assert.deepEqual(nginxPaths(), routerPaths(), FIX)
  })
})
