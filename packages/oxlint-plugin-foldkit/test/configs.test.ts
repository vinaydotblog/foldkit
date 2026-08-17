import { describe, expect, it } from 'vitest'

import plugin from '../src/index.ts'

const testFilePatterns = ['**/*.test.ts', '**/*.test.tsx']

const serverFilePatterns = [
  '**/entry.server.ts',
  '**/entry.server.tsx',
  '**/server/**/*.ts',
  '**/server/**/*.tsx',
  '**/prerender.ts',
]

const serverRestrictedGlobals = [
  'alert',
  'cancelAnimationFrame',
  'cancelIdleCallback',
  'confirm',
  'customElements',
  'document',
  'getComputedStyle',
  'history',
  'IntersectionObserver',
  'localStorage',
  'location',
  'matchMedia',
  'MutationObserver',
  'navigator',
  'prompt',
  'requestAnimationFrame',
  'requestIdleCallback',
  'ResizeObserver',
  'screen',
  'sessionStorage',
  'window',
]

const portableServerGlobals = ['Request', 'Response', 'Headers', 'fetch', 'URL']

const presets = [
  { name: 'recommended', config: plugin.configs.recommended },
  { name: 'all', config: plugin.configs.all },
]

type Preset = (typeof presets)[number]['config']

const readServerRestrictedGlobals = (config: Preset) => {
  const entry = config.overrides[0]?.rules['no-restricted-globals']

  if (entry === undefined || typeof entry === 'string') {
    throw new Error('the server override must restrict globals')
  }

  const [severity, ...restricted] = entry

  return { severity, restricted }
}

describe('configs', () => {
  for (const { name, config } of presets) {
    describe(name, () => {
      it('enables foldkit rules at error severity', () => {
        expect(
          config.rules['foldkit/no-child-message-construction-in-root'],
        ).toBe('error')
        expect(config.rules['foldkit/no-noop-message']).toBe('error')
        expect(config.rules['foldkit/message-binding-matches-tag']).toBe(
          'error',
        )
      })

      it('ships a server override alongside the test override', () => {
        expect(config.overrides).toBeInstanceOf(Array)
        expect(config.overrides).toHaveLength(2)
        expect(config.overrides[0]?.files).toEqual(serverFilePatterns)
        expect(config.overrides[1]?.files).toEqual(testFilePatterns)
      })

      it('excludes test files from the server override', () => {
        expect(config.overrides[0]?.excludeFiles).toEqual(testFilePatterns)
      })

      it('restricts globals outside the portable server contract', () => {
        const { severity, restricted } = readServerRestrictedGlobals(config)

        expect(severity).toBe('error')
        expect(restricted.map(({ name: global }) => global)).toEqual(
          serverRestrictedGlobals,
        )

        for (const { message } of restricted) {
          expect(message).toContain('portable server-entry contract')
          expect(message).not.toContain('throws a ReferenceError')
        }
      })

      it('leaves the portable server globals alone', () => {
        const { restricted } = readServerRestrictedGlobals(config)
        const restrictedNames = restricted.map(({ name: global }) => global)

        for (const global of portableServerGlobals) {
          expect(restrictedNames).not.toContain(global)
        }
      })

      it('turns every foldkit rule off in test files', () => {
        const override = config.overrides[1]

        for (const ruleId of Object.keys(config.rules)) {
          expect(override?.rules[ruleId]).toBe('off')
        }
      })

      it('leaves no-restricted-globals out of the test override', () => {
        expect(Object.keys(config.overrides[1]?.rules ?? {})).not.toContain(
          'no-restricted-globals',
        )
      })
    })
  }
})
