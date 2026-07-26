---
title: "Astro v4 Knowledge Base"
description: "A comprehensive, version-specific guide to Astro 4.x: architecture, components, routing, content, rendering, APIs, configuration, integrations, deployment, and practical patterns."
version_scope: "Astro 4.x documentation snapshot"
generated_on: "2026-07-26"
source_policy: "Synthesised and paraphrased from official Astro v4 documentation; not a verbatim copy."
---

# Astro v4 Knowledge Base

> **Version notice**  
> This reference targets **Astro 4.x** and the archived Astro v4 documentation. The v4 documentation website is an **unmaintained snapshot**. Features, defaults, package versions, adapter behaviour, and APIs may differ in Astro 5 or later. Late-v4 and experimental features are labelled explicitly.

## Contents

1. [What Astro is](#1-what-astro-is)
2. [Core mental model](#2-core-mental-model)
3. [Installation and project setup](#3-installation-and-project-setup)
4. [Project structure](#4-project-structure)
5. [Astro components and template syntax](#5-astro-components-and-template-syntax)
6. [Props, slots, fragments, and composition](#6-props-slots-fragments-and-composition)
7. [Pages, layouts, and HTML output](#7-pages-layouts-and-html-output)
8. [Rendering modes](#8-rendering-modes)
9. [Routing](#9-routing)
10. [Markdown, MDX, and content collections](#10-markdown-mdx-and-content-collections)
11. [Data fetching](#11-data-fetching)
12. [Endpoints and server APIs](#12-endpoints-and-server-apis)
13. [Actions](#13-actions)
14. [Middleware](#14-middleware)
15. [Astro Islands and UI frameworks](#15-astro-islands-and-ui-frameworks)
16. [Client directives and scripts](#16-client-directives-and-scripts)
17. [View transitions and client-side navigation](#17-view-transitions-and-client-side-navigation)
18. [Styling](#18-styling)
19. [Images and assets](#19-images-and-assets)
20. [Fonts and syntax highlighting](#20-fonts-and-syntax-highlighting)
21. [Internationalisation](#21-internationalisation)
22. [Environment variables](#22-environment-variables)
23. [RSS, sitemaps, SEO, and accessibility](#23-rss-sitemaps-seo-and-accessibility)
24. [Astro DB, CMS, authentication, and commerce](#24-astro-db-cms-authentication-and-commerce)
25. [Integrations and adapters](#25-integrations-and-adapters)
26. [Deployment](#26-deployment)
27. [Configuration reference](#27-configuration-reference)
28. [CLI reference](#28-cli-reference)
29. [Runtime API reference](#29-runtime-api-reference)
30. [Built-in modules and directives](#30-built-in-modules-and-directives)
31. [Advanced extension APIs](#31-advanced-extension-apis)
32. [TypeScript, testing, debugging, and upgrades](#32-typescript-testing-debugging-and-upgrades)
33. [Performance and security practices](#33-performance-and-security-practices)
34. [Common implementation recipes](#34-common-implementation-recipes)
35. [Decision guides](#35-decision-guides)
36. [Glossary](#36-glossary)
37. [Official Astro v4 source map](#37-official-astro-v4-source-map)

---

## 1. What Astro is

Astro is a web framework designed primarily for **content-driven websites** such as documentation sites, blogs, portfolios, landing pages, marketing sites, publications, and many ecommerce front ends.

Its central design goal is to ship as little browser JavaScript as possible while still allowing interactive components where they are useful.

Astro combines:

- Server-first rendering and static generation.
- File-based routing.
- `.astro` components with HTML-like templates.
- Markdown, MDX, and typed content collections.
- Optional React, Preact, Vue, Svelte, Solid, Alpine, and other integrations.
- Partial hydration through the Islands architecture.
- Static, server-rendered, or mixed rendering.
- Vite-based development and build tooling.
- Integrations for deployment platforms, images, sitemaps, frameworks, and more.

Astro is not limited to static websites. With an adapter, Astro 4 can render pages on demand, expose API endpoints, use middleware, handle form submissions, and support authenticated or personalised experiences.

### When Astro is a strong fit

Use Astro when:

- Most of the page is content and only parts need interaction.
- Initial loading speed and Core Web Vitals matter.
- SEO and crawlable HTML matter.
- The team wants to use Markdown or a headless CMS.
- The application can be decomposed into mostly static/server-rendered UI plus isolated interactive widgets.
- Different framework components may need to coexist during a migration.

### When another architecture may be simpler

A fully client-rendered application framework may be more direct when nearly every screen is a highly stateful application surface, requires continuous client-side data synchronisation, and gains little from server-rendered content. Astro can still host such an application, but its content-first advantages may be less significant.

---

## 2. Core mental model

Astro is easiest to understand through five ideas.

### 2.1 Server-first components

Code in an Astro component’s frontmatter runs on the server during build or request rendering. It does not automatically become browser JavaScript.

```astro
---
const title = 'Server-rendered page';
const generatedAt = new Date();
---

<h1>{title}</h1>
<p>Generated at {generatedAt.toISOString()}</p>
```

For a statically generated page, the frontmatter runs during `astro build`. For an on-demand page, it runs for each relevant server request.

### 2.2 Zero JavaScript by default

An `.astro` component normally renders HTML and CSS only. Even when it imports a React, Vue, or Svelte component, that component is server-rendered unless a `client:*` directive asks Astro to hydrate it in the browser.

### 2.3 Islands architecture

An **island** is an independently interactive component embedded in otherwise static HTML. Astro hydrates only the selected islands, at selected times.

```astro
---
import Counter from '../components/Counter.jsx';
---

<article>
  <h1>Mostly static article</h1>
  <Counter client:visible />
</article>
```

Here, the article remains static. The counter’s JavaScript loads when the component becomes visible.

### 2.4 Build-time versus request-time rendering

Astro can:

- Generate HTML ahead of time.
- Render HTML when a request arrives.
- Mix both behaviours in the same project when using the appropriate output mode and adapter.

### 2.5 Explicit client behaviour

Client interactivity is opt-in. This makes JavaScript cost visible in the template and encourages intentional hydration.

---

## 3. Installation and project setup

### 3.1 Astro v4 prerequisites

The archived v4 installation guide specifies supported Node.js versions beginning with **Node 18.17.1 or Node 20.3.0**, and does not support Node 19. Use a currently maintained Node release that also satisfies the exact Astro 4 package version you install.

Check the environment:

```bash
node --version
npm --version
```

### 3.2 Create a project

The recommended starter is `create astro`:

```bash
npm create astro@latest
```

To deliberately create an Astro 4 project, pin an Astro 4-compatible project or package version rather than accepting a modern latest release blindly. The archived documentation may display commands whose package resolution now points to newer Astro majors.

Typical installation flow:

```bash
npm install
npm run dev
```

### 3.3 Common package scripts

A standard `package.json` contains scripts similar to:

```json
{
  "scripts": {
    "dev": "astro dev",
    "start": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "astro": "astro"
  }
}
```

### 3.4 Development server

```bash
npm run dev
```

The default development address is generally:

```text
http://localhost:4321
```

Useful variants:

```bash
npm run dev -- --host
npm run dev -- --port 3000
npm run dev -- --open
```

`--host` exposes the development server to the local network. Treat network exposure as a development convenience, not a production deployment.

### 3.5 Production build and preview

```bash
npm run build
npm run preview
```

For a static build, output normally goes to `dist/`. `astro preview` is intended to inspect a local production build; it is not a production-grade hosting server.

### 3.6 Adding integrations

Astro’s CLI can install and configure supported integrations:

```bash
npx astro add react
npx astro add mdx
npx astro add sitemap
```

Review the generated configuration and dependency changes before committing them.

---

## 4. Project structure

A conventional Astro 4 project looks like this:

```text
my-astro-site/
├── public/
│   ├── favicon.svg
│   └── robots.txt
├── src/
│   ├── components/
│   ├── content/
│   │   └── config.ts
│   ├── layouts/
│   ├── pages/
│   │   └── index.astro
│   └── styles/
├── astro.config.mjs
├── package.json
├── tsconfig.json
└── .env
```

### `src/pages/`

Files become routes. This directory is required for normal page routing.

### `src/components/`

Reusable Astro or framework UI components. Components here do not become routes automatically.

### `src/layouts/`

Reusable document or page shells. This is a convention, not a special compiler requirement.

### `src/content/`

Content collections and their schema configuration. In stable Astro 4 content collection workflows, collection definitions are placed in `src/content/config.ts`.

### `src/styles/`

Global styles, tokens, or shared CSS. The location is conventional.

### `public/`

Files copied without bundling or transformation. Reference them with root-relative URLs such as `/favicon.svg`.

Use `public/` for files that must preserve their exact filename or are not imported by source code. Prefer `src/` imports for assets that should be hashed, optimised, bundled, or checked by the build.

### `astro.config.mjs`

Project configuration, integrations, adapters, rendering mode, image rules, Markdown configuration, and Vite customisation.

### `tsconfig.json`

TypeScript settings. Astro starters usually extend an Astro preset such as `astro/tsconfigs/strict`.

---

## 5. Astro components and template syntax

An Astro component uses the `.astro` extension and commonly has two regions:

1. A frontmatter script fenced by `---`.
2. An HTML-like template.

```astro
---
import Badge from './Badge.astro';

interface Props {
  name: string;
  featured?: boolean;
}

const { name, featured = false } = Astro.props;
const upperName = name.toUpperCase();
---

<section class:list={{ card: true, featured }}>
  <h2>{upperName}</h2>
  {featured && <Badge>Featured</Badge>}
</section>

<style>
  .card {
    padding: 1rem;
  }

  .featured {
    border: 2px solid currentColor;
  }
</style>
```

### 5.1 Frontmatter rules

Frontmatter may:

- Import local components, packages, styles, and data.
- Read `Astro.props`, `Astro.params`, cookies, request information, and locals.
- Use top-level `await`.
- Define variables and functions for the template.
- Return a redirect or rewrite in supported contexts.

Frontmatter is not sent to the browser unless its results are explicitly serialised into HTML or client scripts.

### 5.2 Expressions

Use braces for JavaScript expressions:

```astro
<p>{user.name}</p>
<p>{items.length} items</p>
```

### 5.3 Conditional rendering

```astro
{isLoggedIn ? <AccountMenu /> : <LoginLink />}

{error && <p role="alert">{error}</p>}
```

### 5.4 Rendering lists

```astro
<ul>
  {products.map((product) => (
    <li>
      <a href={`/products/${product.slug}/`}>{product.name}</a>
    </li>
  ))}
</ul>
```

### 5.5 Dynamic attributes

```astro
<button disabled={isSaving} aria-busy={isSaving}>
  {isSaving ? 'Saving…' : 'Save'}
</button>
```

Boolean attributes follow HTML semantics. `false`, `null`, and `undefined` generally omit an attribute.

### 5.6 Dynamic tags

A capitalised variable can represent a component or element:

```astro
---
const Element = level === 1 ? 'h1' : 'h2';
---

<Element>{title}</Element>
```

### 5.7 Fragments

Fragments group children without creating an extra HTML element:

```astro
<>
  <dt>{term}</dt>
  <dd>{definition}</dd>
</>
```

### 5.8 Raw HTML

Use `set:html` only with trusted or sanitised content:

```astro
<div set:html={trustedHtml} />
```

`set:html` bypasses normal escaping and can introduce cross-site scripting vulnerabilities.

### 5.9 Text insertion

```astro
<p set:text={plainText} />
```

Normal `{value}` interpolation is usually clearer for text.

### 5.10 Differences from JSX

Astro syntax resembles JSX but produces HTML and follows Astro’s own compiler rules. Important differences include:

- Standard HTML attributes such as `class` are valid.
- Styles can be scoped automatically.
- Script handling is Astro-specific.
- Components can use slots.
- Astro templates do not become a browser component runtime by default.

---

## 6. Props, slots, fragments, and composition

### 6.1 Props

A child reads values from `Astro.props`:

```astro
---
interface Props {
  title: string;
  description?: string;
}

const { title, description = 'No description' } = Astro.props;
---

<article>
  <h2>{title}</h2>
  <p>{description}</p>
</article>
```

Parent usage:

```astro
<Card title="Astro" description="Server-first web framework" />
```

Use TypeScript interfaces to document and validate component usage during development.

### 6.2 Default slots

Child:

```astro
<div class="panel">
  <slot />
</div>
```

Parent:

```astro
<Panel>
  <p>This content fills the default slot.</p>
</Panel>
```

### 6.3 Named slots

Child layout:

```astro
<header><slot name="header" /></header>
<main><slot /></main>
<footer><slot name="footer" /></footer>
```

Parent:

```astro
<PageShell>
  <h1 slot="header">Documentation</h1>
  <article>Main content</article>
  <small slot="footer">Updated 2026</small>
</PageShell>
```

### 6.4 Fallback content

```astro
<aside>
  <slot name="sidebar">
    <p>No sidebar content supplied.</p>
  </slot>
</aside>
```

### 6.5 Checking and rendering slots programmatically

Astro exposes slot helpers:

```astro
---
const hasAside = Astro.slots.has('aside');
const rendered = hasAside ? await Astro.slots.render('aside') : '';
---
```

Use programmatic rendering sparingly. Normal slot composition is simpler and safer.

### 6.6 Transferring slots

A wrapper component can forward slotted content to another component. Keep slot names and ownership clear because deeply nested slot forwarding can become hard to follow.

### 6.7 HTML components

Astro can use `.html` files as components in limited scenarios, but `.astro` components provide frontmatter, props, slots, scoped styles, and stronger composition. Prefer `.astro` for reusable project UI.

---

## 7. Pages, layouts, and HTML output

### 7.1 Page files

Astro pages live in `src/pages/`. Supported route-producing formats include:

- `.astro`
- `.md`
- `.mdx` when the MDX integration is installed
- `.html`
- `.js` and `.ts` for endpoints

### 7.2 Basic page

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
---

<BaseLayout title="Home">
  <h1>Welcome</h1>
</BaseLayout>
```

### 7.3 Layouts

A layout is usually an Astro component that wraps page content:

```astro
---
interface Props {
  title: string;
  description?: string;
}

const { title, description = 'My Astro site' } = Astro.props;
---

<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width" />
    <meta name="description" content={description} />
    <title>{title}</title>
  </head>
  <body>
    <slot />
  </body>
</html>
```

Layouts can nest. A site shell might wrap a documentation layout, which wraps a content page.

### 7.4 Custom error pages

Common files include:

```text
src/pages/404.astro
src/pages/500.astro
```

A custom `404.astro` can be generated for static hosting or used by a server adapter. A custom `500.astro` is a late Astro 4 feature; adapter and hosting behaviour should be tested. Later v4 revisions can provide an error value to the 500 page.

### 7.5 Partial pages

Astro 4 supports partial page output for cases where an endpoint or integration needs an HTML fragment rather than a full document:

```astro
---
export const partial = true;
---

<section>Fragment response</section>
```

Partial pages do not automatically receive the normal full-document treatment. Use them intentionally for embedding, server composition, or specialised responses.

### 7.6 HTML escaping

Astro escapes interpolated strings by default. Preserve this protection and use `set:html` only after sanitisation when rendering user-generated or CMS-provided HTML.

---

## 8. Rendering modes

Astro 4 supports three important project output modes.

### 8.1 `static` — default

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static'
});
```

Pages are normally pre-rendered during `astro build`. This provides simple hosting, predictable output, and excellent cacheability.

An adapter may still be required when a nominally static project uses features that need platform functions or server output.

### 8.2 `server`

```js
export default defineConfig({
  output: 'server',
  adapter: someAdapter()
});
```

Pages render on demand by default. Individual pages can be pre-rendered:

```astro
---
export const prerender = true;
---
```

Use server output for personalised pages, request-time authentication, frequently changing uncached data, dynamic cookies, and runtime-only secrets.

### 8.3 `hybrid`

```js
export default defineConfig({
  output: 'hybrid',
  adapter: someAdapter()
});
```

Pages are pre-rendered by default, while selected routes opt into on-demand rendering:

```astro
---
export const prerender = false;
---
```

Hybrid mode suits content-heavy sites with a small set of dynamic routes.

### 8.4 Rendering decision table

| Need | Recommended starting point |
|---|---|
| Pure documentation, blog, portfolio | `static` |
| Mostly static plus account/dashboard pages | `hybrid` |
| Most routes depend on request-time data | `server` |
| API endpoints only, with static pages | `static` plus compatible server features/adapter, or `hybrid` |

### 8.5 Adapter requirement

On-demand rendering needs an adapter that translates Astro’s server output into the target platform’s runtime model. Choose the adapter for the actual host rather than treating adapters as interchangeable.

### 8.6 Build-time data caveat

In static output, data fetched in frontmatter is captured at build time. Updating the source data does not update the deployed page until a rebuild occurs.

---

## 9. Routing

Astro uses file-based routing from `src/pages/`.

### 9.1 Static routes

```text
src/pages/index.astro        → /
src/pages/about.astro        → /about
src/pages/contact/index.astro → /contact
src/pages/docs/start.md      → /docs/start
```

Whether final URLs use trailing slashes depends on configuration and hosting.

### 9.2 Dynamic routes

Square brackets create dynamic parameters:

```text
src/pages/products/[id].astro
```

Read the value with:

```astro
---
const { id } = Astro.params;
---

<h1>Product {id}</h1>
```

### 9.3 Static generation with `getStaticPaths()`

A dynamic route in a pre-rendered project must identify its build-time paths:

```astro
---
export async function getStaticPaths() {
  const products = [
    { id: 'keyboard', name: 'Keyboard' },
    { id: 'mouse', name: 'Mouse' }
  ];

  return products.map((product) => ({
    params: { id: product.id },
    props: { product }
  }));
}

const { product } = Astro.props;
---

<h1>{product.name}</h1>
```

Rules:

- `params` determine the URL.
- Parameter values must be serialisable in the format Astro expects; path parameters are normally strings or `undefined` for optional rest cases.
- `props` provide arbitrary serialisable data to the page.
- Do not use request-specific values inside a statically generated route.

### 9.4 Rest parameters

```text
src/pages/docs/[...slug].astro
```

This can match nested paths such as `/docs/guides/setup`.

A rest parameter can also represent an optional empty path, depending on the returned `params` value and route design.

### 9.5 Dynamic routes in server mode

With on-demand rendering, a dynamic route can read `Astro.params` directly without pre-enumerating every value through `getStaticPaths()`.

### 9.6 Pagination

`paginate()` is available inside `getStaticPaths()`:

```astro
---
export async function getStaticPaths({ paginate }) {
  const posts = await loadPosts();
  return paginate(posts, { pageSize: 10 });
}

const { page } = Astro.props;
---

<ul>
  {page.data.map((post) => <li>{post.title}</li>)}
</ul>
```

The page object includes page data and navigation metadata such as current page, total pages, and previous/next URLs.

### 9.7 Redirects

Define redirects in `astro.config.mjs`:

```js
export default defineConfig({
  redirects: {
    '/old-page': '/new-page',
    '/legacy/[id]': '/articles/[id]'
  }
});
```

Redirect support and status-code behaviour can differ between static hosts and server adapters. Verify the generated deployment output.

At runtime, a page or endpoint can redirect:

```js
return Astro.redirect('/login');
```

### 9.8 Rewrites

`Astro.rewrite()` was added late in Astro 4. It serves another route’s content without changing the browser’s visible URL.

```astro
---
if (!Astro.locals.user) {
  return Astro.rewrite('/restricted-info');
}
---
```

Rewrites can affect routing, middleware execution, and request handling. Avoid rewrite loops.

### 9.9 Route priority

Astro resolves route conflicts using specificity. In general:

1. Routes with more path segments are more specific.
2. Literal/static segments outrank named dynamic parameters.
3. Named dynamic parameters outrank rest parameters.
4. Pre-rendered dynamic routes can outrank server dynamic routes in relevant conflicts.
5. Endpoints can take priority over page files for equivalent routes.
6. File-system routes outrank configured redirects.

Do not depend on subtle priority rules when clear, non-conflicting route names are possible.

### 9.10 Reserved paths

Internal paths such as `/_astro/` and server-island-related paths are reserved. Do not create application routes that collide with Astro internals.

---

## 10. Markdown, MDX, and content collections

### 10.1 Markdown pages

A Markdown file in `src/pages/` becomes a route:

```md
---
title: Getting Started
description: First steps
---

# Getting Started

Welcome to the guide.
```

Frontmatter becomes accessible to layouts and rendering logic.

### 10.2 Markdown layouts

Markdown frontmatter can specify a layout:

```md
---
layout: ../layouts/DocsLayout.astro
title: Installation
---
```

The layout receives Markdown-related props, including frontmatter and compiled content metadata appropriate to the Astro version.

### 10.3 MDX

Install the MDX integration:

```bash
npx astro add mdx
```

MDX allows component imports and JSX-like component usage inside Markdown content. Use MDX when content authors genuinely need embedded components; ordinary Markdown is easier to keep portable and safe.

### 10.4 Content collections

Content collections provide a structured, typed way to manage related content.

Typical collection configuration:

```ts
// src/content/config.ts
import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    publishedAt: z.date(),
    draft: z.boolean().default(false),
    tags: z.array(z.string()).default([])
  })
});

export const collections = { blog };
```

Example content:

```md
---
title: Astro Islands
description: Hydrate only interactive UI
author: Team
publishedAt: 2026-07-01
draft: false
tags:
  - astro
  - performance
---

# Astro Islands
```

### 10.5 Collection types

Astro 4 distinguishes:

- **Content collections**: Markdown or MDX entries with renderable bodies.
- **Data collections**: Structured data entries such as JSON or YAML, depending on supported loaders/workflows in the specific v4 release.

Some late-v4 content-layer features were experimental. Do not mix newer Astro content-layer documentation into a stable v4 project without confirming package compatibility.

### 10.6 Querying collections

```astro
---
import { getCollection } from 'astro:content';

const posts = (await getCollection('blog', ({ data }) => !data.draft))
  .sort((a, b) => b.data.publishedAt.valueOf() - a.data.publishedAt.valueOf());
---
```

Query one entry:

```ts
import { getEntry } from 'astro:content';

const post = await getEntry('blog', 'astro-islands');
```

Query references in bulk with `getEntries()` when a schema stores collection references.

### 10.7 Rendering an entry

```astro
---
import { getEntry } from 'astro:content';

const entry = await getEntry('blog', Astro.params.slug!);
if (!entry) return Astro.redirect('/404');

const { Content, headings, remarkPluginFrontmatter } = await entry.render();
---

<h1>{entry.data.title}</h1>
<Content />
```

Exact render return fields can vary by Astro revision and content type. Use TypeScript and the installed v4 API definitions as the authority.

### 10.8 References

Schemas can define validated references between entries:

```ts
import { defineCollection, reference, z } from 'astro:content';

const authors = defineCollection({
  type: 'data',
  schema: z.object({
    name: z.string()
  })
});

const posts = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    author: reference('authors')
  })
});
```

References prevent arbitrary strings from silently pointing to missing records.

### 10.9 Slugs and IDs

Content entries have identifiers determined by their paths and collection type. Use Astro’s collection APIs rather than manually reconstructing internal paths.

### 10.10 Content collection best practices

- Validate every field used by templates.
- Store dates as dates, not display-formatted strings.
- Separate draft and published content explicitly.
- Keep URL generation in one helper.
- Treat CMS HTML as untrusted input.
- Use references for authors, categories, products, and related content.
- Avoid querying the filesystem directly when collection APIs provide the same data with types.

---

## 11. Data fetching

Astro supports standard JavaScript data access. No special fetching library is required.

### 11.1 Build-time or request-time `fetch()`

```astro
---
const response = await fetch('https://example.invalid/api/products');

if (!response.ok) {
  throw new Error(`Product request failed: ${response.status}`);
}

const products = await response.json();
---
```

Execution timing depends on rendering mode:

- Static page: runs at build time.
- On-demand page: runs during the request.

### 11.2 Parallel fetching

Avoid serial waterfalls when requests are independent:

```astro
---
const [productsResponse, categoriesResponse] = await Promise.all([
  fetch(PRODUCTS_URL),
  fetch(CATEGORIES_URL)
]);

if (!productsResponse.ok || !categoriesResponse.ok) {
  throw new Error('Required data could not be loaded');
}

const [products, categories] = await Promise.all([
  productsResponse.json(),
  categoriesResponse.json()
]);
---
```

### 11.3 Local files

Use normal imports, content collections, or `import.meta.glob()` depending on the source.

```ts
const modules = import.meta.glob('../content/snippets/*.md', { eager: true });
```

Prefer content collections when the files form a domain model and need schema validation.

### 11.4 GraphQL

Send a normal HTTP request to a GraphQL endpoint. Keep secrets server-side and validate the returned shape.

```ts
const response = await fetch(import.meta.env.GRAPHQL_ENDPOINT, {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    authorization: `Bearer ${import.meta.env.GRAPHQL_TOKEN}`
  },
  body: JSON.stringify({
    query: `query Products { products { id name } }`
  })
});
```

### 11.5 Passing server data to islands

Props passed to hydrated framework components must be serialisable.

```astro
<ProductFilter client:load products={products} />
```

Avoid sending secrets, database objects, functions, class instances, or excessive datasets to the browser.

### 11.6 Caching

Astro does not make every remote request automatically safe or optimally cached. Decide caching at the correct layer:

- Build-time generation.
- CDN caching headers.
- Platform cache APIs.
- Application-level data caches.
- Database query caching.

Never cache user-specific responses publicly.

---

## 12. Endpoints and server APIs

Endpoint files use `.js` or `.ts` under `src/pages/`.

### 12.1 Basic endpoint

```ts
// src/pages/api/status.ts
import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  return new Response(
    JSON.stringify({ ok: true, timestamp: new Date().toISOString() }),
    { headers: { 'content-type': 'application/json' } }
  );
};
```

### 12.2 HTTP methods

Export handlers named for methods such as:

- `GET`
- `POST`
- `PUT`
- `PATCH`
- `DELETE`
- `OPTIONS`
- `HEAD`
- `ALL` where supported by the installed v4 API

### 12.3 Endpoint context

A handler receives a context containing request and route helpers:

```ts
export const POST: APIRoute = async ({ request, cookies, redirect, locals }) => {
  const data = await request.formData();
  // Validate, authorise, mutate, then respond.
  return redirect('/success');
};
```

Common context fields include:

- `request`
- `params`
- `props`
- `cookies`
- `redirect()`
- `rewrite()` in supported late-v4 versions
- `url`
- `site`
- `generator`
- `clientAddress` where the adapter can provide it
- `locals`
- locale helpers

### 12.4 Static endpoints

A static endpoint is generated during the build. Dynamic static endpoints can use `getStaticPaths()`.

```ts
export function getStaticPaths() {
  return [
    { params: { id: 'one' }, props: { value: 1 } },
    { params: { id: 'two' }, props: { value: 2 } }
  ];
}
```

### 12.5 On-demand endpoints

With server or hybrid output and an adapter, endpoint code can run at request time and interact with databases, authentication providers, and platform services.

### 12.6 Form data and JSON

Check content type before parsing and place limits on request size at the platform or application layer.

```ts
const contentType = request.headers.get('content-type') ?? '';

if (!contentType.includes('application/json')) {
  return new Response('Unsupported media type', { status: 415 });
}

const body = await request.json();
```

### 12.7 Endpoint safety checklist

- Validate every input.
- Authenticate before reading private data.
- Authorise the specific operation, not merely the user session.
- Protect state-changing requests from cross-site request forgery where applicable.
- Use parameterised database operations.
- Avoid returning stack traces or secrets.
- Apply rate limits to sensitive or expensive endpoints.
- Set precise cache headers.

---

## 13. Actions

> **Late Astro 4 feature:** Actions were introduced in Astro 4.15. Confirm that the installed Astro 4 version includes them before using this section.

Actions provide type-safe server functions callable from Astro pages, client code, and HTML forms.

### 13.1 Defining actions

```ts
// src/actions/index.ts
import { ActionError, defineAction } from 'astro:actions';
import { z } from 'astro:schema';

export const server = {
  createNote: defineAction({
    input: z.object({
      title: z.string().min(1),
      body: z.string().max(5000)
    }),
    handler: async (input, context) => {
      if (!context.locals.user) {
        throw new ActionError({
          code: 'UNAUTHORIZED',
          message: 'Sign in to create a note.'
        });
      }

      return {
        id: crypto.randomUUID(),
        ...input
      };
    }
  })
};
```

### 13.2 Calling from a client component or script

```ts
import { actions } from 'astro:actions';

const result = await actions.createNote({
  title: 'Astro',
  body: 'Server action example'
});

if (result.error) {
  console.error(result.error.message);
} else {
  console.log(result.data.id);
}
```

### 13.3 Form actions

Set `accept: 'form'` for form-oriented inputs and follow the v4 action form conventions.

```ts
saveProfile: defineAction({
  accept: 'form',
  input: z.object({
    displayName: z.string().min(2)
  }),
  handler: async (input) => ({ saved: true, input })
})
```

### 13.4 Reading action results

Astro’s runtime provides helpers including `Astro.getActionResult()` and `Astro.callAction()` in supported v4 action releases. These help server-render a response after an action or invoke an action from server code.

### 13.5 Error handling

Use action-specific helpers to distinguish:

- Input validation errors.
- Known application/action errors.
- Unexpected internal errors.

Do not expose raw database or infrastructure error messages to the client.

### 13.6 Actions versus endpoints

Use an **action** when the operation is an application command closely tied to Astro UI and benefits from generated types and form integration.

Use an **endpoint** when you need a conventional HTTP API, third-party consumers, webhooks, custom response types, or explicit REST semantics.

---

## 14. Middleware

Middleware intercepts requests and responses around route rendering.

### 14.1 Defining middleware

```ts
// src/middleware.ts
import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (context, next) => {
  const requestId = crypto.randomUUID();
  context.locals.requestId = requestId;

  const response = await next();
  response.headers.set('x-request-id', requestId);
  return response;
});
```

Add a local type declaration:

```ts
// src/env.d.ts
declare namespace App {
  interface Locals {
    requestId: string;
    user?: { id: string; role: string };
  }
}
```

### 14.2 Authentication middleware

```ts
export const onRequest = defineMiddleware(async ({ cookies, locals }, next) => {
  const token = cookies.get('session')?.value;
  locals.user = token ? await validateSession(token) : undefined;
  return next();
});
```

Middleware can establish identity, but each protected route must still enforce authorisation.

### 14.3 Middleware sequencing

`sequence()` combines middleware in a deliberate order:

```ts
import { defineMiddleware, sequence } from 'astro:middleware';

const security = defineMiddleware(async (context, next) => {
  const response = await next();
  response.headers.set('x-content-type-options', 'nosniff');
  return response;
});

const logging = defineMiddleware(async ({ request }, next) => {
  const start = performance.now();
  const response = await next();
  console.log(request.method, new URL(request.url).pathname, performance.now() - start);
  return response;
});

export const onRequest = sequence(logging, security);
```

Ordering matters because each middleware wraps the next one.

### 14.4 Middleware context APIs

The middleware module includes helpers such as:

- `defineMiddleware()`
- `sequence()`
- `createContext()` for advanced programmatic scenarios
- local serialisation helpers in supported revisions

### 14.5 Middleware cautions

- Keep middleware fast; it can run for every matched request.
- Exclude static assets when unnecessary.
- Do not log secrets, session cookies, or full sensitive request bodies.
- Avoid database calls for routes that do not require them.
- Understand how rewrites can cause additional routing cycles.

---

## 15. Astro Islands and UI frameworks

### 15.1 Framework integration

Astro can render components from supported UI frameworks after their integration is installed.

```bash
npx astro add react
```

```astro
---
import SearchBox from '../components/SearchBox.tsx';
---

<SearchBox />
```

Without a client directive, this component is server-rendered HTML and is not interactive in the browser.

### 15.2 Hydrated island

```astro
<SearchBox client:load />
```

Astro sends the framework runtime and component code needed for that island.

### 15.3 Mixing frameworks

A page can contain React, Vue, Svelte, or other supported components together. This is useful for incremental migration, but each additional framework can add runtime and maintenance cost. Standardise where possible.

### 15.4 Sharing state between islands

Independent islands do not automatically share a single framework tree. Common approaches include:

- Browser events.
- URL state.
- A small framework-agnostic store.
- A shared state library compatible with the chosen islands.
- Combining tightly coupled interactive elements into one island.

Avoid hydrating many tiny components that communicate constantly. That pattern can recreate a client application with more boundaries and overhead.

### 15.5 Nested components

A hydrated framework island can contain normal child components from the same framework. Astro controls the outer hydration boundary.

### 15.6 Server-only Astro components

Astro components cannot be hydrated directly as browser components because they have no client runtime. Put browser behaviour in a framework component, custom element, or `<script>`.

### 15.7 Choosing an island boundary

A good island boundary:

- Encapsulates a coherent interaction.
- Has serialisable inputs.
- Can initialise independently.
- Does not require the entire page to hydrate.
- Has a clear loading strategy.

Examples: search, theme switcher, cart button, image carousel, form wizard, live chart, account menu.

---

## 16. Client directives and scripts

### 16.1 Hydration directives

#### `client:load`

Hydrate as soon as possible after the page loads.

```astro
<NavigationMenu client:load />
```

Use for immediately necessary interaction.

#### `client:idle`

Hydrate after the browser becomes idle.

```astro
<Comments client:idle />
```

Later Astro 4 versions support an idle timeout option. Confirm syntax against the installed package.

#### `client:visible`

Hydrate when the component approaches or enters the viewport.

```astro
<Chart client:visible />
```

Useful for below-the-fold content.

#### `client:media`

Hydrate when a media query matches.

```astro
<DesktopSidebar client:media="(min-width: 64rem)" />
```

#### `client:only`

Skip server rendering and render only in the browser. Specify the framework:

```astro
<BrowserOnlyMap client:only="react" />
```

Use only when the component fundamentally cannot render on the server. It sacrifices initial server HTML for that island.

### 16.2 Directive selection

| Interaction | Suggested directive |
|---|---|
| Primary menu or critical form | `client:load` |
| Non-critical widget | `client:idle` |
| Below-the-fold visualisation | `client:visible` |
| Desktop-only interactive UI | `client:media` |
| Browser-library with no SSR support | `client:only` |

### 16.3 Processed scripts

A normal script in an Astro component is processed by Astro/Vite:

```astro
<button class="copy-button" data-value="Astro">Copy</button>

<script>
  document.querySelectorAll<HTMLButtonElement>('.copy-button').forEach((button) => {
    button.addEventListener('click', async () => {
      await navigator.clipboard.writeText(button.dataset.value ?? '');
    });
  });
</script>
```

Processed scripts may be bundled, TypeScript-capable, deduplicated, and converted into module scripts.

### 16.4 Inline scripts

`is:inline` opts out of Astro’s script processing:

```astro
<script is:inline>
  console.log('Inserted directly into the page');
</script>
```

Inline scripts can be repeated for every component instance and cannot use the same bundling assumptions. Use them only for deliberate inline behaviour, third-party snippets, or exact script output.

### 16.5 External scripts

Scripts in `public/` can be referenced directly, while scripts imported from source can be bundled by Vite. Prefer source imports when the code belongs to the application.

### 16.6 Passing server values to scripts

`define:vars` can serialise values into a script or style block:

```astro
---
const analyticsId = 'example';
---

<script define:vars={{ analyticsId }}>
  console.log(analyticsId);
</script>
```

Do not pass secrets; anything embedded in client code is public.

### 16.7 Custom elements

Web components are a lightweight option for isolated interactions without a framework runtime.

```astro
<toggle-panel>
  <button type="button">Toggle</button>
  <div hidden><slot /></div>
</toggle-panel>

<script>
  class TogglePanel extends HTMLElement {
    connectedCallback() {
      const button = this.querySelector('button');
      const panel = this.querySelector('div');
      button?.addEventListener('click', () => {
        if (panel) panel.hidden = !panel.hidden;
      });
    }
  }

  customElements.define('toggle-panel', TogglePanel);
</script>
```

Guard against registering the same custom element more than once in complex setups.

### 16.8 Events after client navigation

When view transitions enable client-side navigation, page scripts and DOM lifecycle assumptions change. Initialise behaviour using Astro’s transition lifecycle events or robust custom elements rather than relying only on the first `DOMContentLoaded` event.

---

## 17. View transitions and client-side navigation

Astro 4 includes a View Transitions router for animated navigation and SPA-like page changes.

### 17.1 Enabling view transitions

Add the component to a shared layout:

```astro
---
import { ViewTransitions } from 'astro:transitions';
---

<head>
  <ViewTransitions />
</head>
```

This can intercept eligible same-site navigation, fetch the next page, swap document content, and animate the transition.

### 17.2 Naming transitions

```astro
<img
  src={article.image}
  alt=""
  transition:name={`article-${article.id}`}
/>
```

Matching names on outgoing and incoming pages can create a shared-element effect. Names must be unique within a page.

### 17.3 Persisting elements

```astro
<AudioPlayer transition:persist />
```

Persistence can keep a DOM element or component state across navigation. Test focus, media state, framework ownership, and prop changes carefully.

### 17.4 Animation directives

Astro provides built-in transition behaviour and supports custom animation definitions. Respect reduced-motion preferences and avoid motion that blocks comprehension.

### 17.5 Lifecycle events

Astro 4’s router exposes events including:

- `astro:before-preparation`
- `astro:after-preparation`
- `astro:before-swap`
- `astro:after-swap`
- `astro:page-load`

Use them to coordinate loading indicators, DOM initialisation, cleanup, analytics, or custom swap behaviour.

```js
document.addEventListener('astro:page-load', () => {
  // Initialise behaviour after the initial load and subsequent navigations.
});
```

### 17.6 Forms

The router can participate in supported form navigation patterns. For sensitive forms, verify method preservation, redirects, validation state, progressive enhancement, and no-JavaScript behaviour.

### 17.7 Fallback behaviour

Browsers without native View Transitions support use Astro’s configured fallback strategy. Design navigation so it remains correct without animation.

### 17.8 Accessibility

- Keep a logical focus destination after navigation.
- Announce meaningful page changes where needed.
- Respect `prefers-reduced-motion`.
- Do not persist stale form or error state accidentally.
- Ensure browser history and back/forward navigation remain understandable.

### 17.9 View transitions are optional

A standard multi-page Astro site is often the simplest and most robust solution. Add the router only when smoother navigation materially improves the experience.

---

## 18. Styling

### 18.1 Scoped component styles

Styles in an `.astro` component are scoped by default:

```astro
<section class="card">...</section>

<style>
  .card {
    border: 1px solid #ccc;
  }
</style>
```

Astro rewrites selectors so they apply to the component’s generated markup.

### 18.2 Global styles

```astro
<style is:global>
  :root {
    font-family: system-ui, sans-serif;
  }

  body {
    margin: 0;
  }
</style>
```

Or import a global stylesheet in a layout:

```astro
---
import '../styles/global.css';
---
```

### 18.3 CSS variables

CSS custom properties work well for design tokens and can cross component boundaries:

```css
:root {
  --space-1: 0.25rem;
  --space-4: 1rem;
  --radius: 0.75rem;
}
```

### 18.4 Dynamic style values

Prefer classes or custom properties over assembling arbitrary CSS strings.

```astro
<div style={`--progress: ${Math.min(progress, 100)}%`}></div>
```

Validate any user-controlled value before placing it in a style context.

### 18.5 CSS modules

Astro supports CSS modules through Vite:

```astro
---
import styles from './card.module.css';
---

<article class={styles.card}>...</article>
```

### 18.6 Preprocessors

Vite supports preprocessors such as Sass when the corresponding package is installed. Avoid adding a preprocessor unless the project benefits from it; modern CSS handles many former preprocessor use cases.

### 18.7 Framework component styles

React, Vue, Svelte, and other framework integrations retain their own styling conventions. Establish a project-wide rule for tokens, global resets, and component ownership.

### 18.8 Style cascade considerations

Astro determines style bundling and injection order from imports and component usage. Keep global layers explicit and avoid relying on accidental import order.

A robust organisation may use:

```css
@layer reset, tokens, base, components, utilities;
```

---

## 19. Images and assets

Astro’s asset system supports local images, public files, and permitted remote images.

### 19.1 Source assets versus public assets

Place imported, transformable images in `src/`:

```text
src/assets/team.jpg
```

Place unchanged files in `public/`:

```text
public/uploads/manual.pdf
```

### 19.2 `<Image />`

```astro
---
import { Image } from 'astro:assets';
import hero from '../assets/hero.jpg';
---

<Image
  src={hero}
  alt="Team collaborating around a product dashboard"
  widths={[640, 960, 1280]}
  sizes="(max-width: 768px) 100vw, 960px"
/>
```

Imported local images carry metadata that lets Astro infer dimensions and reduce layout shift.

### 19.3 `<Picture />`

```astro
---
import { Picture } from 'astro:assets';
import hero from '../assets/hero.jpg';
---

<Picture
  src={hero}
  formats={['avif', 'webp']}
  fallbackFormat="jpg"
  alt="Product team planning a release"
/>
```

Use `<Picture />` when multiple output formats or art-direction-like source control is useful.

### 19.4 Public images

For a public image, provide dimensions because Astro cannot import metadata the same way:

```astro
<Image src="/images/logo.png" width={320} height={96} alt="Company logo" />
```

For simple unchanged public assets, a normal `<img>` is also appropriate.

### 19.5 Remote images

Permit remote sources using `image.domains` or `image.remotePatterns` in configuration. Restrict the allow list rather than allowing arbitrary hosts.

```js
export default defineConfig({
  image: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.example.com',
        pathname: '/media/**'
      }
    ]
  }
});
```

### 19.6 `getImage()`

Use `getImage()` for programmatic image generation:

```ts
import { getImage } from 'astro:assets';

const result = await getImage({
  src: sourceImage,
  width: 800,
  format: 'webp'
});
```

The returned object contains the generated source URL and attributes/metadata needed for custom markup.

### 19.7 Remote dimension inference

`inferRemoteSize()` is available in relevant Astro 4 asset API revisions. It may require a network request and should be used carefully during builds or request rendering.

### 19.8 Image services

Astro v4 documentation describes a default local image service based on Squoosh and supports custom or external image services. Later Astro versions changed image tooling, so use the v4 package documentation for exact service behaviour.

### 19.9 Image best practices

- Always provide meaningful `alt`, or `alt=""` for decorative images.
- Include dimensions to prevent layout shift.
- Avoid sending desktop-sized images to small screens.
- Use responsive `sizes` that reflect actual layout width.
- Do not encode essential text only inside images.
- Treat remote image URLs from users as untrusted.

---

## 20. Fonts and syntax highlighting

### 20.1 Local fonts

Store font files in `public/fonts/` or import them through source assets, depending on the desired bundling strategy.

```css
@font-face {
  font-family: 'Project Sans';
  src: url('/fonts/project-sans.woff2') format('woff2');
  font-display: swap;
  font-weight: 100 900;
  font-style: normal;
}
```

Preload only critical font files and ensure the preload attributes match actual usage.

### 20.2 Fontsource

Fontsource packages provide npm-distributed font files:

```bash
npm install @fontsource-variable/inter
```

```astro
---
import '@fontsource-variable/inter';
---
```

### 20.3 Font performance

- Prefer WOFF2.
- Use a variable font when it meaningfully replaces many files.
- Limit families and weights.
- Use `font-display: swap` or another intentional strategy.
- Provide suitable fallbacks to reduce visual shift.

### 20.4 Syntax highlighting

Astro supports Markdown syntax highlighting, commonly through Shiki in v4.

```js
export default defineConfig({
  markdown: {
    syntaxHighlight: 'shiki',
    shikiConfig: {
      theme: 'github-dark'
    }
  }
});
```

It can also be disabled or configured for alternative processing supported by the installed release.

### 20.5 Remark and rehype plugins

Extend Markdown processing with plugins:

```js
export default defineConfig({
  markdown: {
    remarkPlugins: [],
    rehypePlugins: []
  }
});
```

Plugins run on content and can affect output safety. Audit third-party plugins and sanitise untrusted HTML.

---

## 21. Internationalisation

Astro 4 includes routing helpers for internationalised sites.

### 21.1 Basic configuration

```js
export default defineConfig({
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'fr', 'de'],
    routing: {
      prefixDefaultLocale: false
    }
  }
});
```

A locale can be a string or a configured object with path/code metadata in supported v4 versions.

### 21.2 Route structure

A common structure is:

```text
src/pages/index.astro
src/pages/fr/index.astro
src/pages/de/index.astro
```

Or use dynamic locale routes when appropriate.

### 21.3 URL helper APIs

The `astro:i18n` module provides helpers including:

- `getRelativeLocaleUrl()`
- `getAbsoluteLocaleUrl()`
- `getRelativeLocaleUrlList()`
- `getAbsoluteLocaleUrlList()`
- `getPathByLocale()`
- `getLocaleByPath()`
- `redirectToDefaultLocale()`
- `redirectToFallback()`
- `notFound()`
- i18n `middleware()`
- `requestHasLocale()`

Some manual-routing helpers were introduced in Astro 4.6. Verify availability for earlier 4.x releases.

### 21.4 Runtime locale values

Astro’s request context can expose values such as:

- `Astro.currentLocale`
- `Astro.preferredLocale`
- `Astro.preferredLocaleList`

These depend on configuration and request headers. Browser language preference is a hint, not proof of a user’s desired locale.

### 21.5 Fallbacks

Configure locale fallbacks when one locale can use another locale’s content. Make fallback behaviour visible to users when it could cause mixed-language pages.

### 21.6 Translation architecture

Keep these concerns separate:

- Route locale.
- UI message catalogue.
- Content translation.
- Date/number/currency formatting.
- SEO alternates.
- User preference persistence.

### 21.7 i18n SEO

Generate:

- Correct `<html lang>`.
- Canonical URLs.
- `hreflang` alternate links.
- Locale-aware sitemap entries.
- Stable localised slugs where required.

Do not automatically redirect every crawler based only on `Accept-Language`; it can harm indexing and shareable URLs.

---

## 22. Environment variables

Astro uses Vite’s environment variable model.

### 22.1 Reading variables

```ts
const apiUrl = import.meta.env.API_URL;
```

Built-in values include Vite/Astro mode information such as `MODE`, `DEV`, `PROD`, `BASE_URL`, and `SITE` where applicable.

### 22.2 Public variables

Only variables prefixed with `PUBLIC_` are intentionally available to browser code:

```env
PUBLIC_ANALYTICS_ID=abc123
```

```ts
console.log(import.meta.env.PUBLIC_ANALYTICS_ID);
```

A public prefix means **not secret**.

### 22.3 Server secrets

```env
DATABASE_URL=...
SESSION_SECRET=...
```

Read server-only values only in frontmatter, endpoints, middleware, actions, or server modules. Never pass them into hydrated component props or `define:vars`.

### 22.4 Environment files

Vite supports files such as:

```text
.env
.env.local
.env.development
.env.production
.env.development.local
.env.production.local
```

Do not commit secret-bearing local files.

### 22.5 Build-time versus runtime values

Static builds embed the values available during the build. Server adapters may support runtime environment access differently. Hosting platforms can expose secrets through platform-specific APIs or bindings.

### 22.6 Typed environment variables

Astro 4 included experimental typed environment support in later releases. Treat it as version-sensitive and confirm the exact `experimental.env` syntax and generated types for the installed v4 package.

### 22.7 Validation pattern

Fail early for required server configuration:

```ts
function requiredEnv(name: string): string {
  const value = import.meta.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}
```

For robust applications, use a schema validator and separate server and public schemas.

---

## 23. RSS, sitemaps, SEO, and accessibility

### 23.1 RSS

Install `@astrojs/rss` and create an endpoint such as `src/pages/rss.xml.js`:

```js
import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  const posts = await getCollection('blog', ({ data }) => !data.draft);

  return rss({
    title: 'Project Blog',
    description: 'Product and engineering notes',
    site: context.site,
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.publishedAt,
      description: post.data.description,
      link: `/blog/${post.slug}/`
    }))
  });
}
```

Set `site` in Astro config so absolute feed URLs can be generated reliably.

### 23.2 Sitemap

Use the official sitemap integration:

```bash
npx astro add sitemap
```

Dynamic on-demand routes cannot always be discovered automatically; provide entries or generation logic as required.

### 23.3 Canonical metadata

A reusable SEO component should centralise:

- Title.
- Description.
- Canonical URL.
- Open Graph data.
- Social image.
- Robots directives.
- Locale alternates.
- Structured data when appropriate.

### 23.4 Structured data

Generate JSON-LD from validated data and escape safely:

```astro
<script type="application/ld+json" set:html={JSON.stringify(schema)} />
```

Do not include arbitrary user-provided object keys or untrusted HTML in structured data.

### 23.5 Accessibility baseline

- Use semantic HTML before adding ARIA.
- Keep heading levels logical.
- Associate labels with controls.
- Make all interaction keyboard accessible.
- Maintain visible focus styles.
- Provide useful alt text.
- Respect reduced motion.
- Ensure colour contrast.
- Preserve focus and announcements during client navigation.
- Test rendered output, not only components in isolation.

### 23.6 Performance is part of SEO, not all of SEO

Astro’s low-JavaScript output helps performance, but search quality also depends on content, metadata, canonicalisation, link structure, crawlability, and correct status codes.

---

## 24. Astro DB, CMS, authentication, and commerce

### 24.1 Astro DB in the v4 era

Astro DB was documented in Astro 4 as a database workflow integrated with Astro and Astro Studio. It used `astro:db` APIs and a schema configuration file.

A simplified historical shape:

```ts
// db/config.ts
import { column, defineDb, defineTable } from 'astro:db';

const Comment = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    body: column.text(),
    createdAt: column.date()
  }
});

export default defineDb({
  tables: { Comment }
});
```

Queries imported database objects from `astro:db`.

Because hosted services and recommended Astro DB workflows changed after v4, treat the archived Astro DB section as historical. For a maintained project, verify the current status of Astro DB, Studio, libSQL, Drizzle integration, and migration tooling before adoption.

### 24.2 Headless CMS integration

Astro can consume any CMS with an HTTP, GraphQL, SDK, or filesystem interface.

Typical flow:

1. Store credentials in server-only environment variables.
2. Fetch content at build time or request time.
3. Validate the response.
4. Map CMS records to a project domain model.
5. Generate routes and metadata.
6. Configure webhooks to rebuild static deployments when content changes.

Do not let provider-specific response shapes leak across every component. Use a data-access layer.

### 24.3 Backend services

Astro can work with hosted backends and databases through endpoints, actions, middleware, or server frontmatter. The correct integration depends on the adapter runtime: Node, edge, serverless functions, or another platform target.

### 24.4 Authentication

Astro does not force one authentication provider. A complete implementation needs:

- Session creation and validation.
- Secure cookie settings.
- Middleware or route checks.
- Per-operation authorisation.
- CSRF protection where applicable.
- Safe redirects.
- Session revocation and expiry.
- Rate limits for login and recovery.

Example cookie goals:

```ts
cookies.set('session', token, {
  httpOnly: true,
  secure: import.meta.env.PROD,
  sameSite: 'lax',
  path: '/',
  maxAge: 60 * 60 * 24 * 7
});
```

Do not store sensitive session contents in a readable client cookie.

### 24.5 Ecommerce

Astro works well for catalogue and marketing pages, while commerce providers handle products, inventory, checkout, tax, and payments.

A sound pattern:

- Pre-render product content when possible.
- Fetch current price/stock at request time only when needed.
- Create checkout sessions on the server.
- Verify webhook signatures.
- Never trust totals submitted by the browser.
- Make order fulfilment idempotent.

### 24.6 Provider guides versus Astro guarantees

The Astro documentation links to many provider-specific guides. Those integrations are not all maintained by the Astro core team and can change independently. Follow the provider’s current security and SDK documentation while keeping the Astro v4 runtime constraints in mind.

---

## 25. Integrations and adapters

### 25.1 Integrations

An Astro integration extends configuration, build behaviour, development tooling, content processing, or framework support.

```js
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  integrations: [react(), sitemap()]
});
```

### 25.2 Integration hooks

Astro 4’s integration API includes hooks such as:

- `astro:config:setup`
- `astro:config:done`
- `astro:server:setup`
- `astro:server:start`
- `astro:server:done`
- `astro:build:start`
- `astro:build:setup`
- `astro:build:generated`
- `astro:build:ssr`
- `astro:build:done`
- `astro:route:setup`

Hook availability and argument shapes can vary across v4 minor releases.

### 25.3 Integration skeleton

```ts
import type { AstroIntegration } from 'astro';

export function exampleIntegration(): AstroIntegration {
  return {
    name: 'example-integration',
    hooks: {
      'astro:config:setup': ({ updateConfig, logger }) => {
        logger.info('Configuring example integration');
        updateConfig({
          vite: {
            define: {
              __EXAMPLE__: JSON.stringify(true)
            }
          }
        });
      }
    }
  };
}
```

### 25.4 Hook ordering

Integrations run in configuration order, but hook phases and internal updates can interact. Keep integrations focused and test combinations.

### 25.5 Adapters

An adapter is a specialised integration that turns Astro’s server build into a deployable runtime for a target host.

Adapters provide information such as:

- Server entry point.
- Supported output model.
- Platform features.
- Build artefact layout.
- Edge or serverless conventions.
- Route/function splitting capability.

### 25.6 Adapter feature flags

Astro 4’s adapter API includes feature declarations such as function-per-route and edge middleware support in relevant versions. These are adapter-author concerns, not normal application configuration.

### 25.7 Choosing an adapter

Choose based on:

- Hosting provider.
- Node versus edge runtime.
- Native module support.
- File-system access.
- Image optimisation support.
- Streaming behaviour.
- Environment variable model.
- Function limits and cold starts.
- Middleware and rewrite support.

### 25.8 Official versus community integrations

Official integrations generally receive coordinated compatibility updates. Community integrations can be excellent, but inspect maintenance status, supported Astro versions, issue activity, and security posture.

---

## 26. Deployment

### 26.1 Static deployment

For `output: 'static'`:

```bash
npm ci
npm run build
```

Publish `dist/` to the host.

### 26.2 Server deployment

For server or hybrid output:

1. Install the target adapter.
2. Configure `output` and `adapter`.
3. Build on a compatible Node/runtime version.
4. Deploy the generated server and client artefacts according to the adapter.

### 26.3 Base paths

When deploying under a subpath, configure `base` and ensure links/assets use Astro-aware URL generation.

```js
export default defineConfig({
  site: 'https://example.com',
  base: '/docs'
});
```

### 26.4 Environment consistency

Match development, build, preview, and production assumptions:

- Node version.
- Environment variables.
- case-sensitive filenames.
- runtime APIs.
- package lockfile.
- native dependencies.
- trailing slash and redirect behaviour.

### 26.5 CI build example

```yaml
steps:
  - uses: actions/checkout@v4
  - uses: actions/setup-node@v4
    with:
      node-version: 20
      cache: npm
  - run: npm ci
  - run: npm run astro -- check
  - run: npm test --if-present
  - run: npm run build
```

Pin the Node version to one supported by the selected Astro 4 release and dependencies.

### 26.6 Deployment verification

Test the deployed environment for:

- Direct navigation to nested routes.
- 404/500 behaviour.
- Redirects and rewrites.
- API methods.
- Cookies and secure headers.
- Remote images.
- canonical URLs and sitemap.
- environment variables.
- cache correctness.
- client navigation.

---

## 27. Configuration reference

Astro configuration usually lives in `astro.config.mjs`:

```js
import { defineConfig } from 'astro/config';

export default defineConfig({
  // options
});
```

This section summarises Astro 4 configuration. Some fields arrived in specific 4.x minors.

### 27.1 Top-level options

#### `site`

Canonical deployment origin.

```js
site: 'https://www.example.com'
```

Used for canonical URLs, RSS, sitemap generation, and `Astro.site`.

#### `base`

Base path for a site deployed below the domain root.

```js
base: '/docs'
```

#### `trailingSlash`

Controls development and route matching behaviour for trailing slashes. Values include strategies equivalent to always, never, or ignore in Astro 4.

#### `redirects`

Map source routes to destination routes or redirect definitions.

#### `output`

```js
output: 'static' // or 'server' / 'hybrid'
```

#### `adapter`

The deployment adapter instance.

#### `integrations`

Array of integration instances.

#### `root`

Project root. Normally the current working directory.

#### `srcDir`

Default source directory is conventionally `./src`.

#### `publicDir`

Default static public directory is conventionally `./public`.

#### `outDir`

Default build output is conventionally `./dist`.

#### `cacheDir`

Default internal cache is conventionally under `node_modules/.astro`.

#### `compressHTML`

Controls HTML minification/compression behaviour during builds.

#### `scopedStyleStrategy`

Controls how Astro emits scoped-style selectors. Astro 4 supports strategies based on attributes, classes, or `:where()`-style specificity.

#### `security`

Security-related framework options. Exact sub-options are version-sensitive; consult the installed Astro 4 reference before enabling or disabling origin checks.

#### `vite`

Passes Vite configuration through Astro:

```js
vite: {
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname
    }
  }
}
```

Prefer TypeScript path aliases that agree with Vite/Astro resolution.

### 27.2 Build options

```js
build: {
  format: 'directory',
  assets: '_astro',
  inlineStylesheets: 'auto'
}
```

Important fields include:

- `format`: output page file organisation, such as directory-style or file-style output; v4 also documented a preserve mode.
- `client`: client output directory in server builds.
- `server`: server output directory.
- `assets`: generated asset directory name.
- `assetsPrefix`: separate origin/prefix for built assets, including per-extension mappings in supported revisions.
- `serverEntry`: server entry filename.
- `redirects`: whether adapter/server redirect output is generated.
- `inlineStylesheets`: when built styles are inlined.
- `concurrency`: build generation concurrency in versions that expose it.

### 27.3 Development server

```js
server: {
  host: true,
  port: 4321,
  open: false,
  headers: {
    'x-frame-options': 'DENY'
  }
}
```

`port` defaults to 4321 unless unavailable or overridden. Custom headers here affect the development server and should not be mistaken for production platform headers.

### 27.4 Dev toolbar

```js
devToolbar: {
  enabled: true
}
```

The development toolbar provides local development apps and diagnostics. It is not part of the production site.

### 27.5 Prefetch

```js
prefetch: {
  prefetchAll: false,
  defaultStrategy: 'hover'
}
```

Prefetch can also be controlled on links through `data-astro-prefetch`. Strategies are version-specific and include behaviours such as hover, tap, viewport, or load in supported Astro 4 revisions.

### 27.6 Image configuration

```js
image: {
  endpoint: '/_image',
  domains: ['cdn.example.com'],
  remotePatterns: [
    { protocol: 'https', hostname: 'images.example.com' }
  ]
}
```

Fields include:

- `endpoint`
- `service`
- `domains`
- `remotePatterns`

Custom service configuration depends on whether optimisation happens locally or through an external image service.

### 27.7 Markdown configuration

```js
markdown: {
  syntaxHighlight: 'shiki',
  shikiConfig: {},
  remarkPlugins: [],
  rehypePlugins: [],
  gfm: true,
  smartypants: true,
  remarkRehype: {}
}
```

- `gfm` enables GitHub-Flavoured Markdown features.
- `smartypants` transforms eligible punctuation.
- `remarkRehype` passes options into the Markdown-to-HTML pipeline.

### 27.8 i18n configuration

```js
i18n: {
  defaultLocale: 'en',
  locales: ['en', 'fr'],
  fallback: { fr: 'en' },
  routing: {
    prefixDefaultLocale: false,
    redirectToDefaultLocale: true
  }
}
```

Available routing fields vary by Astro 4 minor release and automatic/manual routing mode.

### 27.9 Experimental options in Astro 4

The v4 configuration reference includes experimental flags such as:

- `directRenderScript`
- `contentCollectionCache`
- `clientPrerender`
- `globalRoutePriority`
- typed `env`
- `serverIslands`
- `contentIntellisense`
- `contentLayer`

Experimental flags can change without normal compatibility guarantees. Do not enable them merely because they appear in the archived reference.

### 27.10 Server islands

> **Experimental in Astro 4, added around Astro 4.12.**

Server islands allow selected server-rendered components to be deferred while the surrounding page is delivered earlier. They require compatible server/hybrid output and an adapter.

A directive such as `server:defer` marks the boundary in supported releases.

Use server islands only after testing:

- Adapter support.
- Loading fallback.
- Caching and user-specific data.
- Error handling.
- Layout stability.
- Request count and latency.

### 27.11 Configuration discipline

- Keep configuration typed through `defineConfig()`.
- Avoid giant inline Vite configuration; extract reusable plugins.
- Document why experimental flags are enabled.
- Test every output mode and adapter change in a production-like environment.
- Do not copy current Astro config fields into Astro 4 without checking availability.

---

## 28. CLI reference

Run through package scripts or `npx astro`.

### 28.1 `astro dev`

Starts the development server.

```bash
npx astro dev --host --port 4321 --open
```

### 28.2 `astro build`

Creates a production build.

```bash
npx astro build
```

Useful flags include root/config/output/site/base overrides and verbosity controls.

### 28.3 `astro preview`

Locally serves the built output for inspection.

```bash
npx astro preview
```

Adapter-specific server builds may have limitations in preview compared with the real target runtime.

### 28.4 `astro check`

Runs diagnostics and type checking with the required checker dependency.

```bash
npx astro check
```

Use it in CI before building.

### 28.5 `astro sync`

Generates Astro types and synchronises content/config-related type information without a full build.

```bash
npx astro sync
```

Useful before external TypeScript tooling or in CI workflows.

### 28.6 `astro add`

Installs and configures supported integrations.

```bash
npx astro add react mdx sitemap
```

### 28.7 `astro docs`

Opens Astro documentation.

### 28.8 `astro info`

Prints environment and dependency information useful for bug reports.

### 28.9 `astro preferences`

Manages supported CLI preferences in relevant Astro 4 releases.

### 28.10 `astro telemetry`

Displays or changes anonymous telemetry preference.

### 28.11 Common flags

Astro 4 documents common flags including:

- `--root`
- `--config`
- `--outDir`
- `--site`
- `--base`
- `--port`
- `--host`
- `--open`
- `--verbose`
- `--silent`
- `--version`
- `--help`

Not every flag applies to every command.

### 28.12 Programmatic API

Astro 4 exposes experimental programmatic functions for operations such as development, build, preview, and sync. Treat these APIs as version-sensitive and avoid building long-lived tooling without pinning Astro tightly.

---

## 29. Runtime API reference

The `Astro` global is available in `.astro` frontmatter and provides route/render context.

### 29.1 `Astro.props`

Props passed by a parent or `getStaticPaths()`.

### 29.2 `Astro.params`

Dynamic route parameters.

### 29.3 `Astro.request`

The standard `Request` object for the current render. Full request details are meaningful primarily during on-demand rendering; static generation uses a build-time request representation.

### 29.4 `Astro.url`

A `URL` object for the current route.

### 29.5 `Astro.response`

Allows supported response header/status adjustments before output is finalised.

```astro
---
Astro.response.headers.set('cache-control', 'private, no-store');
---
```

### 29.6 `Astro.cookies`

Cookie helper API:

```astro
---
const theme = Astro.cookies.get('theme')?.value ?? 'system';
Astro.cookies.set('theme', 'dark', {
  path: '/',
  sameSite: 'lax'
});
---
```

Cookie methods include get, set, delete, and checks in supported revisions.

### 29.7 `Astro.redirect()`

Returns a redirect response:

```astro
---
return Astro.redirect('/sign-in', 302);
---
```

### 29.8 `Astro.rewrite()`

Late-v4 API for rendering another route while retaining the current visible URL.

### 29.9 `Astro.site`

Configured site URL, when `site` is set.

### 29.10 `Astro.generator`

Astro generator metadata string useful in `<meta name="generator">`.

### 29.11 `Astro.clientAddress`

Client IP address when available through the adapter. Do not treat it as a strong identity signal; proxies and privacy layers affect it.

### 29.12 `Astro.locals`

Request-local values populated by middleware.

### 29.13 `Astro.slots`

- `Astro.slots.has(name)`
- `Astro.slots.render(name, args?)`

### 29.14 `Astro.self`

A self-reference used in advanced recursive component patterns. Ensure recursion terminates.

### 29.15 Locale fields

- `Astro.currentLocale`
- `Astro.preferredLocale`
- `Astro.preferredLocaleList`

### 29.16 Action helpers

Available in Astro 4 action releases:

- `Astro.getActionResult()`
- `Astro.callAction()`

### 29.17 `Astro.glob()`

Astro 4 includes `Astro.glob()` for loading groups of local files in supported contexts. For structured content, prefer content collections; for general modules, consider Vite’s `import.meta.glob()`.

### 29.18 `getStaticPaths()` context

A route’s `getStaticPaths()` receives utilities such as `paginate()` and route-generation context supported by the release.

### 29.19 Endpoint context

Endpoint handlers receive equivalents for request, params, props, cookies, redirect, rewrite, URL, site, generator, client address, locals, and locale values.

---

## 30. Built-in modules and directives

### 30.1 `astro:content`

Core content collection exports include:

- `defineCollection()`
- schema support, commonly `z`
- `reference()`
- `getCollection()`
- `getEntry()`
- `getEntries()`
- `getEntryBySlug()` in applicable content collection APIs
- `getDataEntryById()` in applicable data collection APIs
- collection-related TypeScript types

Exact query helpers changed across Astro generations; use the installed v4 declarations.

### 30.2 `astro:assets`

Key exports include:

- `Image`
- `Picture`
- `getImage()`
- `inferRemoteSize()` in supported revisions

### 30.3 `astro:middleware`

- `defineMiddleware()`
- `sequence()`
- advanced context and local serialisation helpers in supported versions

### 30.4 `astro:transitions`

- `ViewTransitions`
- transition animation utilities and router-related APIs supported by v4

### 30.5 `astro:i18n`

Locale URL, path, redirect, fallback, middleware, and request-locale helpers.

### 30.6 `astro:actions`

Late-v4 exports include:

- `defineAction()`
- `ActionError`
- action result/error type guards
- generated `actions` client interface

### 30.7 Template directives

#### `class:list`

Combines classes from strings, arrays, and object conditions:

```astro
<div class:list={['card', { selected, disabled }]} />
```

#### `set:html`

Injects unescaped HTML. Sanitise first.

#### `set:text`

Sets escaped text content.

#### `is:global`

Makes a component style global.

#### `is:inline`

Prevents normal Astro processing for a script or style.

#### `define:vars`

Serialises server variables into script/style scope.

#### `is:raw`

Treats child content as raw text in supported elements and use cases.

#### `client:*`

Hydrates framework islands according to load, idle, visibility, media, or browser-only strategy.

#### `transition:*`

Controls view-transition names, persistence, and animation behaviour.

#### `server:defer`

Experimental Astro 4 server-island directive in compatible releases.

---

## 31. Advanced extension APIs

These APIs are mainly for integration authors, adapter authors, tooling developers, or specialised platform work.

### 31.1 Integration API

An integration can:

- Update Astro configuration.
- Add Vite plugins.
- Inject scripts.
- Add renderer/framework support.
- Observe or modify routes.
- Participate in dev-server and build lifecycle hooks.
- Log through Astro’s integration logger.

Keep an integration deterministic and avoid mutating unrelated project state.

### 31.2 Adapter API

An adapter declares how Astro’s SSR output becomes a platform server or function. Adapter authors should implement the documented v4 entry points and feature support rather than relying on private build internals.

### 31.3 Image service API

Custom image services can implement hooks such as:

- `getURL()`
- `parseURL()`
- `transform()`
- `getHTMLAttributes()`
- `getSrcSet()`
- `validateOptions()`

A **local service** can transform image bytes during build/runtime. An **external service** usually generates provider URLs rather than transforming locally.

Security requirements:

- Validate source URLs.
- Restrict allowed hosts.
- Constrain dimensions and quality.
- Prevent arbitrary file reads.
- Avoid unbounded transformation work.

### 31.4 Dev toolbar API

Astro 4’s development toolbar supports custom apps. APIs include concepts such as:

- `addDevToolbarApp()`
- App metadata: ID, name, icon, entry point.
- `defineToolbarApp()`
- Initialisation and toggle lifecycle.
- Client/server communication.
- Toolbar events and custom elements.

Toolbar apps are development-only and should not be required for production correctness.

### 31.5 Container API

Astro 4 documented an experimental Container API for rendering Astro components outside the normal page pipeline, useful for tests and integrations. Because it was experimental, pin the exact Astro version and follow its matching API reference.

### 31.6 Prefetch API

Astro can prefetch navigation targets through configuration and `data-astro-prefetch` link attributes. Select a conservative strategy to avoid wasting bandwidth or triggering expensive server pages unnecessarily.

---

## 32. TypeScript, testing, debugging, and upgrades

### 32.1 TypeScript

Astro supports TypeScript in frontmatter, scripts, endpoints, actions, and configuration.

A strict configuration:

```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

Run:

```bash
npx astro sync
npx astro check
```

### 32.2 Type component props

```astro
---
interface Props {
  href: string;
  label: string;
  external?: boolean;
}

const { href, label, external = false } = Astro.props;
---
```

### 32.3 Testing layers

A practical Astro test strategy includes:

1. **Pure unit tests** for functions and domain logic.
2. **Component/render tests** for output where supported by tooling.
3. **Endpoint/action tests** against request handlers.
4. **Browser tests** for navigation, hydration, forms, and accessibility.
5. **Build tests** to catch route and content errors.

### 32.4 Testing tools

Astro works with Vite-oriented tools such as Vitest and browser automation tools such as Playwright. Use versions compatible with the pinned Astro 4/Vite dependency graph.

### 32.5 Browser test example

```ts
import { expect, test } from '@playwright/test';

test('article page is navigable', async ({ page }) => {
  await page.goto('/blog/astro-islands/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Astro');
  await expect(page).toHaveTitle(/Astro/);
});
```

### 32.6 Debugging server code

A `console.log()` in Astro frontmatter appears in the terminal/build logs, not the browser console.

```astro
---
console.log('Runs on server/build');
---
```

### 32.7 Debugging browser code

A log inside a client script or hydrated component appears in browser developer tools.

### 32.8 Common hydration problems

- Missing `client:*` directive.
- Browser-only APIs used during server rendering.
- Non-serialisable props.
- Hydration output differs from server HTML.
- Component framework integration not installed.
- Client navigation requires reinitialisation.

### 32.9 Common routing problems

- Dynamic static route missing `getStaticPaths()`.
- Conflicting route filenames.
- Incorrect `base` path.
- Host lacks fallback/direct-route configuration.
- Trailing slash mismatch.
- Redirect or rewrite loop.

### 32.10 Common content problems

- Schema rejects frontmatter.
- Date written in a non-date format.
- Collection name mismatch.
- Draft content accidentally included.
- Duplicate/incorrect slug.
- MDX integration missing.

### 32.11 Upgrade policy

Astro follows semantic versioning at the package level, but integrations, Vite, adapters, and experimental features have their own compatibility considerations.

For an Astro 4 maintenance project:

- Pin the intended `astro` 4.x range.
- Pin major versions of official integrations compatible with it.
- Read every intermediate migration guide before moving to Astro 5+.
- Run `astro check`, tests, and a production build.
- Verify rendered HTML and deployed runtime behaviour.
- Remove or replace experimental features before a major upgrade where possible.

### 32.12 Archived documentation caveat

The v4 site may contain links or interactive version selectors that lead to current package information. Treat pages explicitly labelled as the v4 snapshot as the source for v4 APIs, and use the project lockfile plus installed type definitions for final confirmation.

---

## 33. Performance and security practices

### 33.1 Performance priorities

1. Keep content server-rendered.
2. Hydrate only genuinely interactive components.
3. Choose the least eager viable client directive.
4. Optimise images and fonts.
5. Avoid duplicate framework runtimes.
6. Fetch independent data in parallel.
7. Use static rendering where freshness permits.
8. Cache public responses intentionally.
9. Keep middleware and server islands efficient.
10. Measure real pages with production builds.

### 33.2 JavaScript budget

Every hydrated island has costs:

- Component code.
- Framework runtime or shared chunks.
- Serialised props.
- Network requests.
- Parsing and execution.
- Hydration work.

A component being easy to hydrate does not make hydration free.

### 33.3 Avoid hydration waterfalls

A parent island that loads, then fetches data, then reveals another client-only component creates delay. Prefer server-provided initial data, parallel requests, and coherent island boundaries.

### 33.4 Static versus dynamic freshness

Choose a regeneration strategy based on acceptable staleness:

- Build on content webhook.
- Scheduled rebuild.
- On-demand server rendering.
- Edge/CDN cache with revalidation.
- Client refresh for non-SEO live data.

### 33.5 Security checklist

- Escape output by default.
- Sanitise before `set:html`.
- Keep secrets out of `PUBLIC_*` and client props.
- Validate action, endpoint, route, cookie, and query inputs.
- Enforce authentication and authorisation server-side.
- Use secure, HTTP-only session cookies.
- Protect state-changing requests against CSRF.
- Restrict remote images and external fetch destinations.
- Verify webhook signatures.
- Apply security headers at the production host.
- Avoid unsafe redirects based on arbitrary input.
- Keep Astro 4 and dependencies patched if the project remains online.

### 33.6 Content security policy

A strict CSP can improve security, but inline scripts, third-party widgets, view transitions, and analytics need deliberate handling. Generate nonces or hashes through the target server/platform where appropriate rather than weakening policy globally.

### 33.7 Error handling

Return useful status codes and user-safe messages. Log detailed errors only to secure server observability. Custom 500 pages must not reveal stack traces or configuration.

### 33.8 Dependency age risk

Astro 4 is archived. A long-lived production site should plan an upgrade because old framework, adapter, image, Vite, and transitive dependencies may stop receiving fixes.

---

## 34. Common implementation recipes

### 34.1 Static blog with content collections

```text
src/content/config.ts
src/content/blog/*.md
src/pages/blog/index.astro
src/pages/blog/[slug].astro
src/layouts/BlogPost.astro
src/pages/rss.xml.js
```

Flow:

1. Define a validated collection.
2. Query published posts.
3. Generate each slug with `getStaticPaths()`.
4. Render the collection entry.
5. Generate RSS and sitemap.

### 34.2 Dynamic account page

Use server or hybrid output:

```astro
---
export const prerender = false;

const user = Astro.locals.user;
if (!user) return Astro.redirect('/login');

const account = await loadAccount(user.id);
---
```

Middleware establishes session identity; the page enforces access and loads user-specific data.

### 34.3 Search island

```astro
---
import Search from '../components/Search.tsx';
const index = await buildSmallSearchIndex();
---

<Search client:idle index={index} />
```

For a large index, fetch it on demand or query a server endpoint instead of serialising it into every page.

### 34.4 Secure contact form with an endpoint

```astro
<form method="POST" action="/api/contact">
  <label>
    Email
    <input type="email" name="email" required />
  </label>
  <label>
    Message
    <textarea name="message" required maxlength="5000"></textarea>
  </label>
  <button type="submit">Send</button>
</form>
```

Endpoint responsibilities:

- Parse form data.
- Validate fields.
- Check anti-spam controls.
- Rate-limit.
- Send/store message.
- Redirect to a success page.

### 34.5 API JSON response

```ts
export const GET: APIRoute = async ({ url }) => {
  const query = url.searchParams.get('q')?.trim() ?? '';
  if (query.length < 2) {
    return Response.json({ results: [] });
  }

  const results = await search(query);
  return Response.json(
    { results },
    { headers: { 'cache-control': 'public, max-age=60' } }
  );
};
```

Confirm `Response.json()` runtime support in the target deployment; otherwise construct a `Response` manually.

### 34.6 Dynamic Open Graph image

Generate at build time for static pages or through an endpoint for request-time content. Set explicit dimensions, cache headers, and fonts. Do not perform expensive image generation without caching.

### 34.7 Theme switcher without a framework

Use a small inline head script to avoid a flash, plus a custom element or processed script for the control. Store only a non-sensitive preference.

### 34.8 Headless CMS rebuild flow

```text
Editor publishes → CMS webhook → deployment build hook → astro build → CDN deploy
```

Authenticate the webhook/build hook and debounce rapid update bursts.

### 34.9 Protected API route

```ts
export const POST: APIRoute = async ({ locals, request }) => {
  if (!locals.user) return new Response('Unauthorized', { status: 401 });
  if (locals.user.role !== 'admin') return new Response('Forbidden', { status: 403 });

  const input = await request.json();
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return Response.json({ error: 'Invalid input' }, { status: 400 });
  }

  await performAdminOperation(parsed.data);
  return new Response(null, { status: 204 });
};
```

### 34.10 Multi-locale content

Use a clear content model:

```text
src/content/blog/en/...
src/content/blog/fr/...
```

Store a translation key or reference so alternate-language entries can be linked without guessing slugs.

### 34.11 Component library structure

```text
src/components/
├── primitives/
├── patterns/
├── content/
└── interactive/
```

Keep framework islands under `interactive/` so client JavaScript boundaries are visible during code review.

### 34.12 Pagination route

```text
src/pages/blog/[...page].astro
```

Use `paginate()` and provide canonical URLs for page one versus later pages. Avoid duplicate `/blog`, `/blog/1`, and `/blog/page/1` content.

---

## 35. Decision guides

### 35.1 `.astro` component or framework component?

Use `.astro` when the component:

- Renders content and markup.
- Has server-side data preparation.
- Does not need persistent browser state.
- Can use a small script or custom element for light interaction.

Use a framework component when it:

- Has complex interactive state.
- Benefits from the framework ecosystem.
- Needs reactive rendering.
- Is already maintained in that framework.

### 35.2 Static, hybrid, or server?

Ask:

1. Must this page differ for each request or user?
2. How quickly does its data change?
3. Can a webhook rebuild it?
4. Can the CDN cache it safely?
5. Does the host support the required adapter runtime?

Default to static until a specific request-time requirement appears.

### 35.3 Content collection or CMS?

Use a local collection when:

- Content changes through Git.
- Developers or technical writers own publishing.
- Preview workflows are simple.
- Schema-controlled files are sufficient.

Use a CMS when:

- Non-technical editors need a UI.
- Workflow, approvals, media management, and scheduled publishing matter.
- Content must be shared across channels.

Both can coexist.

### 35.4 Endpoint or action?

| Requirement | Endpoint | Action |
|---|---:|---:|
| Third-party API consumer | Yes | No/less suitable |
| Webhook | Yes | No |
| Typed Astro UI command | Possible | Strong fit |
| Native form workflow | Possible | Strong fit in late v4 |
| Custom binary/stream response | Strong fit | Not primary use |
| Explicit REST semantics | Strong fit | No |

### 35.5 Client script, custom element, or island?

- Tiny DOM behaviour: processed script.
- Reusable encapsulated browser widget: custom element.
- Complex reactive UI: framework island.

### 35.6 `src/` asset or `public/` asset?

- Needs optimisation, hashing, import metadata: `src/`.
- Must retain exact URL/name or pass through unchanged: `public/`.

---

## 36. Glossary

**Adapter**  
A deployment integration that translates Astro’s server output for a host/runtime.

**Action**  
A late-v4 type-safe server function callable from Astro UI or forms.

**Content collection**  
A schema-validated group of content or data entries.

**Endpoint**  
A `.js` or `.ts` route that returns a standard web `Response`.

**Frontmatter**  
The server-side script between `---` fences in an `.astro` file.

**Hydration**  
Attaching browser-side framework behaviour to server-rendered component HTML.

**Integration**  
A plugin that participates in Astro’s configuration, development, or build lifecycle.

**Island**  
An independently hydrated interactive component within otherwise static/server-rendered HTML.

**Layout**  
A reusable page wrapper, usually an Astro component with a slot.

**Middleware**  
Code that runs around route handling to inspect or modify requests, context, and responses.

**On-demand rendering**  
Generating a response when a request arrives instead of during the build.

**Partial page**  
An Astro route that emits an HTML fragment rather than a complete document.

**Pre-rendering**  
Generating output ahead of requests, usually during `astro build`.

**Server island**  
An experimental Astro 4 deferred server-rendered component boundary.

**Slot**  
A placeholder through which a parent supplies child content to an Astro component.

**View transition**  
Animated/client-routed navigation between documents using Astro’s transition router and browser APIs.

---

## 37. Official Astro v4 source map

This knowledge base was synthesised from the official archived Astro v4 documentation. Use the following sections for exact API signatures and version badges:

- [Astro v4 documentation home](https://v4.docs.astro.build/en/)
- [Getting started](https://v4.docs.astro.build/en/getting-started/)
- [Install and set up Astro](https://v4.docs.astro.build/en/install-and-setup/)
- [Why Astro](https://v4.docs.astro.build/en/concepts/why-astro/)
- [Islands architecture](https://v4.docs.astro.build/en/concepts/islands/)
- [Project structure](https://v4.docs.astro.build/en/basics/project-structure/)
- [Astro components](https://v4.docs.astro.build/en/basics/astro-components/)
- [Astro syntax](https://v4.docs.astro.build/en/reference/astro-syntax/)
- [Pages](https://v4.docs.astro.build/en/basics/astro-pages/)
- [Layouts](https://v4.docs.astro.build/en/basics/layouts/)
- [Rendering modes](https://v4.docs.astro.build/en/basics/rendering-modes/)
- [Routing](https://v4.docs.astro.build/en/guides/routing/)
- [Markdown content](https://v4.docs.astro.build/en/guides/markdown-content/)
- [Content collections](https://v4.docs.astro.build/en/guides/content-collections/)
- [Data fetching](https://v4.docs.astro.build/en/guides/data-fetching/)
- [Endpoints](https://v4.docs.astro.build/en/guides/endpoints/)
- [Actions](https://v4.docs.astro.build/en/guides/actions/)
- [Middleware](https://v4.docs.astro.build/en/guides/middleware/)
- [UI framework components](https://v4.docs.astro.build/en/guides/framework-components/)
- [Scripts and event handling](https://v4.docs.astro.build/en/guides/client-side-scripts/)
- [View transitions](https://v4.docs.astro.build/en/guides/view-transitions/)
- [Styling](https://v4.docs.astro.build/en/guides/styling/)
- [Images](https://v4.docs.astro.build/en/guides/images/)
- [Fonts](https://v4.docs.astro.build/en/guides/fonts/)
- [Syntax highlighting](https://v4.docs.astro.build/en/guides/syntax-highlighting/)
- [Internationalisation](https://v4.docs.astro.build/en/guides/internationalization/)
- [Environment variables](https://v4.docs.astro.build/en/guides/environment-variables/)
- [RSS](https://v4.docs.astro.build/en/guides/rss/)
- [Astro DB](https://v4.docs.astro.build/en/guides/astro-db/)
- [CMS integrations](https://v4.docs.astro.build/en/guides/cms/)
- [Backend services](https://v4.docs.astro.build/en/guides/backend/)
- [Authentication](https://v4.docs.astro.build/en/guides/authentication/)
- [Ecommerce](https://v4.docs.astro.build/en/guides/ecommerce/)
- [Integrations guide](https://v4.docs.astro.build/en/guides/integrations-guide/)
- [Deploy guide](https://v4.docs.astro.build/en/guides/deploy/)
- [Configuration reference](https://v4.docs.astro.build/en/reference/configuration-reference/)
- [CLI reference](https://v4.docs.astro.build/en/reference/cli-reference/)
- [Runtime API reference](https://v4.docs.astro.build/en/reference/api-reference/)
- [Template directives](https://v4.docs.astro.build/en/reference/directives-reference/)
- [`astro:content` API](https://v4.docs.astro.build/en/reference/modules/astro-content/)
- [`astro:assets` API](https://v4.docs.astro.build/en/reference/modules/astro-assets/)
- [`astro:actions` API](https://v4.docs.astro.build/en/reference/modules/astro-actions/)
- [`astro:middleware` API](https://v4.docs.astro.build/en/reference/modules/astro-middleware/)
- [`astro:i18n` API](https://v4.docs.astro.build/en/reference/modules/astro-i18n/)
- [`astro:transitions` API](https://v4.docs.astro.build/en/reference/modules/astro-transitions/)
- [Integrations API](https://v4.docs.astro.build/en/reference/integrations-reference/)
- [Adapter API](https://v4.docs.astro.build/en/reference/adapter-reference/)
- [Image service API](https://v4.docs.astro.build/en/reference/image-service-reference/)
- [Dev toolbar API](https://v4.docs.astro.build/en/reference/dev-toolbar-app-reference/)
- [Upgrade Astro](https://v4.docs.astro.build/en/upgrade-astro/)
- [Troubleshooting](https://v4.docs.astro.build/en/guides/troubleshooting/)
- [Testing](https://v4.docs.astro.build/en/guides/testing/)

---

## Final usage notes

1. Treat this file as a **learning and implementation reference**, not a substitute for the exact API page matching the installed Astro 4 minor version.
2. Keep `astro`, official integrations, adapters, and Vite-compatible packages pinned together.
3. Mark every experimental feature in production code and create an upgrade/removal plan.
4. Prefer server-rendered HTML and add client JavaScript only for real interaction.
5. For a new production project in 2026, evaluate the maintained Astro release rather than starting on Astro 4 unless compatibility constraints require it.
