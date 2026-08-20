import { Array, Option } from 'effect'
import { describe, expect, it } from 'vitest'

import { BLOG_SECTION } from '../src/page/blog/meta'
import { findBySlug } from '../src/page/example/meta'
import {
  BestPracticesKeyingRoute,
  BestPracticesSideEffectsRoute,
  BlogPostRoute,
  ExampleDetailRoute,
  ExamplesRoute,
  PlaygroundRoute,
} from '../src/route'
import { blogPosts } from './blogPosts'
import { routeToMetadata } from './metadata'

const resolveApiModuleName = (slug: string) => slug

describe('routeToMetadata', () => {
  describe('static documentation routes', () => {
    it('uses the rendered page title for the examples overview', () => {
      expect(routeToMetadata(ExamplesRoute(), resolveApiModuleName).title).toBe(
        'Examples',
      )
    })

    it('describes every Runtime-managed side-effect boundary', () => {
      expect(
        routeToMetadata(BestPracticesSideEffectsRoute(), resolveApiModuleName)
          .description,
      ).toContain('Commands, Subscriptions, Mounts, ManagedResources')
    })

    it('does not tell readers to key branches', () => {
      expect(
        routeToMetadata(BestPracticesKeyingRoute(), resolveApiModuleName)
          .description,
      ).toBe(
        'Use stable Model identifiers for list items and entity roots. Let view-function identity handle branches.',
      )
    })
  })

  describe('BlogPost', () => {
    it('reports the post frontmatter for a registered slug', () => {
      const { slug, frontmatter } = Option.getOrThrow(Array.head(blogPosts))

      expect(
        routeToMetadata(
          BlogPostRoute({ postSlug: slug }),
          resolveApiModuleName,
        ),
      ).toEqual({
        title: frontmatter.title,
        description: frontmatter.description,
        section: BLOG_SECTION,
      })
    })

    it('throws naming the slug and the registry for an unregistered slug', () => {
      expect(() =>
        routeToMetadata(
          BlogPostRoute({ postSlug: 'no-such-post' }),
          resolveApiModuleName,
        ),
      ).toThrow(
        'Blog post "no-such-post" is missing from the blog post registry.',
      )
    })
  })

  describe('ExampleDetail', () => {
    it('reports the example title and description for a registered slug', () => {
      const example = Option.getOrThrow(findBySlug('counter'))

      expect(
        routeToMetadata(
          ExampleDetailRoute({ exampleSlug: 'counter' }),
          resolveApiModuleName,
        ),
      ).toEqual({
        title: example.title,
        description: example.description,
        section: 'Examples',
      })
    })

    it('throws naming the slug and the registry for an unregistered slug', () => {
      expect(() =>
        routeToMetadata(
          ExampleDetailRoute({ exampleSlug: 'no-such-example' }),
          resolveApiModuleName,
        ),
      ).toThrow(
        'Example "no-such-example" is missing from the example registry.',
      )
    })
  })

  describe('Playground', () => {
    it('derives the playground title and description for a registered slug', () => {
      const example = Option.getOrThrow(findBySlug('counter'))

      expect(
        routeToMetadata(
          PlaygroundRoute({ exampleSlug: 'counter' }),
          resolveApiModuleName,
        ),
      ).toEqual({
        title: `${example.title} Playground`,
        description: `Edit and run the ${example.title} example live in your browser.`,
        section: 'Playground',
      })
    })

    it('throws naming the slug and the registry for an unregistered slug', () => {
      expect(() =>
        routeToMetadata(
          PlaygroundRoute({ exampleSlug: 'no-such-example' }),
          resolveApiModuleName,
        ),
      ).toThrow(
        'Playground example "no-such-example" is missing from the example registry.',
      )
    })
  })
})
