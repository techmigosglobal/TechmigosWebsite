---
title: "Micro Frontends: When and How to Use Them"
description: "A comprehensive guide to micro frontend architecture, covering when to adopt this pattern, implementation strategies, and real-world lessons from production deployments."
pubDate: 2025-07-15
author: "Ravali"
authorRole: "Software Engineer & Content Creator"
authorBio: "Ravali writes practical engineering guides for students and developers, combining hands-on project stories, career lessons, and trend-focused technical research."
category: "Architecture"
tags: ["Micro Frontends", "Architecture", "Scaling", "Tutorial"]
heroImage: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&h=600&fit=crop"
readTime: 9
draft: false
---

The micro frontend pattern has generated enormous buzz—and equal amounts of confusion. When I first heard about it, I thought it was just another buzzword for iframes. I was wrong. After leading two large-scale micro frontend migrations, I can tell you this: when done right, it's transformative. When done wrong, it's a nightmare.

## My Experience

Our team inherited a sprawling React application that had grown unwieldy over four years. Seven developers, one codebase, endless merge conflicts. Deadlines were missed not because of complexity in features, but because of complexity in coordination.

We tried splitting into feature branches. We tried git submodules. Nothing worked. Then someone suggested micro frontends. I was skeptical—I'd seen module federation attempts go wrong.

But we went for it. Six months later, we'd transformed our delivery speed. What took two weeks now took two days. The trade-offs were real, but the benefits outweighed them.

Here's what I learned.

## When Micro Frontends Make Sense

Before diving into implementation, let's talk about when this architecture actually helps:

### Ideal Scenarios

- Multiple teams working on a single product
- Different parts of the application require different tech stacks
- Independent deployment is more important than initial load performance
- Large application with clear domain boundaries

### When to Avoid

- Small to medium-sized applications
- Single team or small team (fewer than 5 developers)
- Tight coupling between features
- Performance is the absolute priority
- Simple page-based websites

### Decision Matrix

| Factor | Micro Frontends | Monolithic |
|--------|-----------------|------------|
| Team Size | 5+ teams | 1-2 teams |
| Tech Diversity | Needed | Not needed |
| Deployment | Independent required | Coordinated fine |
| Performance Priority | Medium-High | Very High |

## Implementation Approaches

### 1. Build-Time Integration

Each micro frontend is built and published as a package:

```javascript
// In shared-components package
export { Card } from './Card';
export { Button } from './Button';

// In consuming app
import { Card } from '@company/shared-components';
```

**Pros:** Type-safe, full IDE support, simple debugging
**Cons:** Requires rebuild when any micro frontend changes, tight coupling

### 2. Module Federation (Recommended)

Webpack 5's module federation lets you share code at runtime:

```javascript
// webpack.config.js (host app)
const { ModuleFederationPlugin } = require('webpack').container;

module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: 'host',
      remotes: {
        cart: 'cart@https://cart.example.com/entry.js',
        checkout: 'checkout@https://checkout.example.com/entry.js',
      },
      shared: { react: 'singleton', 'react-dom': 'singleton' },
    }),
  ],
};
```

```javascript
// webpack.config.js (cart micro frontend)
module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: 'cart',
      filename: 'entry.js',
      exposes: {
        './Cart': './src/Cart',
        './CartSummary': './src/CartSummary',
      },
      shared: { react: 'singleton', 'react-dom': 'singleton' },
    }),
  ],
};
```

### 3. iFrame-Based (Last Resort)

```html
<!-- Only for truly independent applications -->
<iframe
  src="https://legacy.example.com/old-app"
  style="width: 100%; height: 100%; border: none;"
></iframe>
```

**Note:** IFrames create isolated JavaScript contexts, making communication difficult. Use only for truly legacy systems that cannot be modernized.

## Shared State and Communication

One of the hardest parts of micro frontends is sharing state. Here are proven patterns:

### Custom Event Bus

```javascript
// shared/event-bus.js
class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => callback(data));
    }
  }
}

export const eventBus = new EventBus();

// Usage in cart micro frontend
eventBus.emit('item-added', { itemId: '123', quantity: 1 });

// Usage in header micro frontend
eventBus.on('item-added', (data) => {
  updateCartCount(data.quantity);
});
```

### URL-Based Communication

```typescript
// When state needs to be shared via URL
function addToCartUrl(productId: string, quantity: number) {
  const url = new URL(window.location.href);
  url.searchParams.set('addToCart', JSON.stringify({ productId, quantity }));
  window.history.pushState({}, '', url);
}

// Listen for changes
window.addEventListener('popstate', () => {
  const params = new URLSearchParams(window.location.search);
  const addToCart = params.get('addToCart');
  if (addToCart) {
    const { productId, quantity } = JSON.parse(addToCart);
    addToCart(productId, quantity);
  }
});
```

## Deployment Strategy

Each micro frontend should deploy independently:

```yaml
# .github/workflows/deploy-cart.yml
name: Deploy Cart

on:
  push:
    paths:
      - 'packages/cart/**'
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: azure/static-web-apps-deploy@v1
        with:
          app_location: 'packages/cart'
          output_location: ''
          app_name: 'company-cart'
```

## Common Pitfalls and Solutions

### Pitfall 1: Shared Dependencies Version Mismatch

```javascript
// Solution: Use singleton shared dependencies
const deps = {
  react: { singleton: true, requiredVersion: '^18.0.0' },
  'react-dom': { singleton: true, requiredVersion: '^18.0.0' },
};
```

### Pitfall 2: CSS Conflicts

```css
/* Solution: Use CSS modules or scoped styles */
.cart-module__button {
  /* Styles are scoped to cart module */
}

/* Or use Shadow DOM for true isolation */
```

### Pitfall 3: Performance Regression

```javascript
// Solution: Lazy load micro frontends
const Cart = lazy(() => import('cart/Cart'));

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Cart />
    </Suspense>
  );
}
```

## What Students Should Do Next

1. **Start with module federation in a small project** — Understand the patterns before applying them at scale
2. **Identify clear domain boundaries first** — Don't fragment your app arbitrarily
3. **Plan your shared infrastructure early** — Communication patterns, design system, and styling approach

Micro frontends aren't for everyone. But when you have the right situation, they're incredibly powerful. The key is knowing when—and how—to implement them properly.