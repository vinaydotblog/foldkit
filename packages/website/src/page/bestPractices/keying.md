# Keying

## Keys and View Identity

Foldkit tracks two kinds of identity while diffing:

- A **view identity**, which Foldkit manages, names the function that produced a subtree. When the identity changes at one position, the old DOM node is replaced instead of patched.
- A **key**, which you write, names the data entity rendered at one position or inside a dynamic list.

The `@foldkit/vite-plugin` build stamps view identity automatically. The remaining keying rule is the part only your Model can answer: key mapped items and changing entities by a stable identifier.

Replacing the node keeps element-owned state from crossing a logical boundary. For example: focus, an uncontrolled input value, an element's scroll position, and an open `details` element stay with the entity that owns them.

:::Info{label="Coming from React"}
A Foldkit view function plays the role a component type plays during reconciliation. The same function patches; a different function replaces. Keys still identify list items and entities, but the build handles branch identity for every branching syntax.
:::

### View Functions Are Identity Boundaries {#view-function-boundaries}

The build brands every function you write and stamps that identity onto the VNodes it returns. The syntax that selects the function does not matter. `if`/`else`, ternaries, Effect `Match`, and other pattern matching all reach the same result because identity belongs to the function that produced the subtree.

::Snippet{name="keyingBranchingViews" label="branching views example"}

Neither arm needs a key. `editorView` and `summaryView` have different identities, so switching replaces the subtree even when both return the same root tag.

The same rule preserves continuity. A position keeps its DOM while the same view function renders it. States that share one scaffold should therefore route through one function. Effect `Match` arms are covered whether they delegate or return an element inline because each arm handler is itself a function.

Conditional inserts between view-function siblings need no keys:

::Snippet{name="keyingConditionalInserts" label="conditional inserts example"}

When the discount toggles, the differ matches `summaryView` and `checkoutView` by identity. Both keep their DOM while the discount subtree is inserted or removed.

A shared `Html` value is also safe. The Runtime clones a reused VNode before diffing, so sharing one value across positions or renders does not corrupt the tree. A plain value has no identity of its own, however. Swapping two same-tag values at one position patches in place. Use named view functions when that switch must reset DOM state.

### Mapped List Items

Mapped rows all come from the same function, so view identity cannot distinguish them. Which row is which is a fact about the Model. Key each item by a stable identifier such as its id or UUID, never by its array position:

::Snippet{name="keyingListItems" label="list items keying example"}

The same rule applies when one view function renders different entities at a fixed position. A detail page may render every article through `articlePageView`, so view identity alone says every article is the same subtree. Key the root by the article id or slug so local DOM state does not carry into the next article:

::Snippet{name="keyingDetailPage" label="detail page keying example"}

Two hand-written siblings whose entities can swap are a list in disguise. Render them as a mapped list and key them like any other items.

Key by what an entity is, never by what it currently shows. A key derived from displayed data changes whenever the content changes. Each edit then tears down the node and discards focus, text selection, and other element-owned state:

::Snippet{name="keyingIdentityNotData" label="identity keying example"}

### Inline Same-Tag Branches

A ternary containing two inline elements with the same tag patches in place because both arms belong to the surrounding function. When the switch must reset DOM state, extract each arm into a named view function. The functions become separate identity boundaries.

### Without the Build Integration

:::Warning{label="Always build with the plugin"}
Identity is stamped by `@foldkit/vite-plugin`, which `create-foldkit-app` includes by default. Do not build a Foldkit app without it.
:::

Without the plugin, Foldkit falls back to positional matching plus keys. Every branch point then needs a hand-written key at each arm root.
