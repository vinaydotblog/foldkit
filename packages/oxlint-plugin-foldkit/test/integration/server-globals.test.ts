import { build } from 'esbuild'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'

// Runs the shipped `recommended` preset through real oxlint against server and
// client fixtures. The guardrail is a scoped override of oxlint's built-in
// `no-restricted-globals`, so a config-shape assertion proves nothing on its
// own: only real oxlint decides whether the globs match and the globals fire.

const here = dirname(fileURLToPath(import.meta.url))
const pluginRoot = join(here, '..', '..')
const repoRoot = join(pluginRoot, '..', '..')
const oxlintBin = join(repoRoot, 'node_modules', '.bin', 'oxlint')

const invalidFixtures: Record<string, string> = {
  'invalid/src/entry.server.ts': `
export const renderPage = (request: Request): string =>
  document.body.dataset['route'] ?? request.url
`,
  'invalid/server/main.ts': `
export const readTheme = (): string | null => localStorage.getItem('theme')
`,
  'invalid/scripts/prerender.ts': `
export const originFor = (path: string): string => window.location.origin + path
`,
}

const validFixtures: Record<string, string> = {
  'valid/src/entry.server.ts': `
export const renderPage = async (request: Request): Promise<Response> => {
  const url = new URL(request.url)
  const upstream = await fetch(url.origin + '/health')
  const headers = new Headers({ 'content-type': 'text/html' })

  return new Response(await upstream.text(), { headers })
}
`,
  'valid/server/parse.ts': `
export const titleOf = (parse: (html: string) => { title: string }, html: string): string => {
  const document = parse(html)

  return document.title
}
`,
  'valid/scripts/prerender.ts': `
export const hrefOf = (window: { location: { href: string } }): string => window.location.href
`,
  'valid/src/entry.client.ts': `
export const mountPoint = (): Element | null => document.querySelector('#app')
`,
  'valid/server/handler.test.ts': `
export const container = (): Element => document.createElement('div')
`,
}

let workDir: string
let configPath: string

const writeFixtures = (fixtures: Record<string, string>): void => {
  for (const [path, source] of Object.entries(fixtures)) {
    const fullPath = join(workDir, path)
    mkdirSync(dirname(fullPath), { recursive: true })
    writeFileSync(fullPath, source)
  }
}

beforeAll(async () => {
  workDir = mkdtempSync(join(tmpdir(), 'foldkit-server-globals-'))
  const bundlePath = join(workDir, 'plugin.js')
  await build({
    entryPoints: [join(pluginRoot, 'src', 'index.ts')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile: bundlePath,
  })

  const { default: plugin } = await import(bundlePath)
  configPath = join(workDir, '.oxlintrc.json')
  writeFileSync(
    configPath,
    JSON.stringify({
      ...plugin.configs.recommended,
      jsPlugins: [{ name: 'foldkit', specifier: bundlePath }],
      categories: { correctness: 'off' },
    }),
  )

  writeFixtures(invalidFixtures)
  writeFixtures(validFixtures)
})

const countRestrictedGlobals = (target: string): number => {
  try {
    execFileSync(oxlintBin, ['--config', configPath, join(workDir, target)], {
      encoding: 'utf8',
    })
    return 0
  } catch (error) {
    const output = String((error as { stdout?: unknown }).stdout ?? '')
    const matches = output.match(/eslint\(no-restricted-globals\)/g)
    return matches === null ? 0 : matches.length
  }
}

describe('recommended preset server globals override', () => {
  it('flags a restricted global in every server-only file', () => {
    expect(countRestrictedGlobals('invalid')).toBe(
      Object.keys(invalidFixtures).length,
    )
  })

  it('stays quiet on Node globals, local bindings, and client files', () => {
    expect(countRestrictedGlobals('valid')).toBe(0)
  })

  it('exempts a test file sitting inside a server directory', () => {
    expect(countRestrictedGlobals('invalid/server/main.ts')).toBe(1)
    expect(countRestrictedGlobals('valid/server/handler.test.ts')).toBe(0)
  })
})
