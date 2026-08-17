---
'@foldkit/oxlint-plugin': minor
---

Restrict globals outside Foldkit's portable server-entry contract. TypeScript keeps the DOM lib in scope for every file in a program, so `document.body` in an `entry.server.ts` typechecks even when the server host has no document. Both presets now turn oxlint's built-in `no-restricted-globals` on for `entry.server.ts`, `entry.server.tsx`, anything under a `server/` directory, and `prerender.ts`.

The restricted list covers `document`, `window`, `navigator`, `localStorage`, `sessionStorage`, `history`, `location`, `alert`, `confirm`, `prompt`, `requestAnimationFrame`, `cancelAnimationFrame`, `requestIdleCallback`, `cancelIdleCallback`, `getComputedStyle`, `matchMedia`, `customElements`, `screen`, `IntersectionObserver`, `ResizeObserver`, and `MutationObserver`. Individual server runtimes expose some of these names, but their availability and meaning are not consistent across deployment targets. Each diagnostic directs applications to use a server API available everywhere they deploy or pass the value into the entry. Web `Request` and `Response` form Foldkit's public host boundary. The rule also leaves `Headers`, `fetch`, and `URL` unrestricted.

Local bindings and parameters that shadow a restricted name are untouched, as are references in type positions. The override carries `excludeFiles: ['**/*.test.ts', '**/*.test.tsx']`, so a test sitting next to server code can still use a DOM environment, and any `no-restricted-globals` config your own app writes for its test files keeps working.

One caveat if your app configures `no-restricted-globals` itself. Oxlint replaces a rule's options in an override rather than merging them, so inside the server patterns this override takes the place of your own entries. Restate them in an app-level override on the same patterns if you need them there.

Lint may newly fail on a server file that depends on a global outside the portable contract. Some hosts expose individual restricted names, so this is a portability rule rather than a claim that every read throws in Node.
