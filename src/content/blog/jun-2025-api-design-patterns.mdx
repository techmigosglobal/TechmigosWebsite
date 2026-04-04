---
title: "RESTful API Design Patterns That Scale"
description: "Learn battle-tested RESTful API design patterns that handle millions of requests, including versioning, pagination, filtering, and error handling strategies."
pubDate: 2025-06-15
author: "Ravali"
authorRole: "Software Engineer & Content Creator"
authorBio: "Ravali writes practical engineering guides for students and developers, combining hands-on project stories, career lessons, and trend-focused technical research."
category: "Backend"
tags: ["API", "REST", "Backend", "Tutorial"]
heroImage: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&h=600&fit=crop"
readTime: 8
draft: false
---

I've designed APIs that handle 50 requests per second and APIs that handle 50,000. The patterns that work at small scale often break at large scale. After building APIs for fintech, e-commerce, and healthcare, I've learned what separates scalable API design from the rest.

## My Experience

The worst API I ever built looked perfect in development. It had proper RESTful URLs, HTTP verbs, and JSON responses. But when we launched to production with real users, the problems started immediately.

Pagination was inconsistent. Filtering didn't work for complex queries. Error messages were useless. And the API couldn't handle traffic spikes without timing out.

I spent the next three months completely redesigning it. What I learned shaped every API I've built since. Here's the playbook.

## URL Structure and Resource Naming

### Standard RESTful Patterns

```
GET    /api/v1/users              # List users
GET    /api/v1/users/{id}         # Get single user
POST   /api/v1/users              # Create user
PUT    /api/v1/users/{id}         # Update user (full)
PATCH  /api/v1/users/{id}         # Update user (partial)
DELETE /api/v1/users/{id}         # Delete user
```

### Relationships

```
GET    /api/v1/users/{id}/posts           # User's posts
GET    /api/v1/users/{id}/orders          # User's orders
POST   /api/v1/users/{id}/activate        # Action on user
```

### Use Nouns for Resources, Verbs for Actions

| Wrong | Correct | Reason |
|-------|---------|--------|
| `/getUsers` | `/users` | HTTP method defines action |
| `/userCreate` | POST `/users` | Use HTTP verbs |
| `/users/getActive` | GET `/users?status=active` | Use query params |

## Pagination Patterns

Offset-based works for small datasets; cursor-based scales better:

### Offset Pagination

```http
GET /api/v1/users?page=2&limit=20
```

```json
{
  "data": [...],
  "pagination": {
    "page": 2,
    "limit": 20,
    "total": 1000,
    "totalPages": 50
  }
}
```

### Cursor-Based Pagination (Recommended for Scale)

```http
GET /api/v1/users?cursor=eyJpZCI6MTAwfQ&limit=20
```

```json
{
  "data": [...],
  "pagination": {
    "nextCursor": "eyJpZCI6MTAwfQ",
    "previousCursor": "eyJpZCI6ODB9",
    "hasMore": true
  }
}
```

```typescript
// Implementation example
async function getUsers(cursor?: string, limit: number = 20) {
  const cursorData = cursor ? JSON.parse(atob(cursor)) : { id: 0 };

  const users = await db.user.findMany({
    take: limit + 1, // Fetch one extra to check hasMore
    where: { id: { gt: cursorData.id } },
    orderBy: { id: 'asc' },
    include: { profile: true },
  });

  const hasMore = users.length > limit;
  const data = hasMore ? users.slice(0, -1) : users;

  return {
    data,
    nextCursor: hasMore ? btoa(JSON.stringify({ id: data[data.length - 1].id })) : null,
  };
}
```

## Filtering and Sorting

### Filter Syntax

```http
GET /api/v1/products?category=electronics&price_min=100&price_max=500
GET /api/v1/users?status=active&role=admin
GET /api/v1/orders?created_after=2025-01-01&status=shipped
```

### Sort Syntax

```http
GET /api/v1/products?sort=price:asc
GET /api/v1/products?sort=created_at:desc,name:asc
```

### Combined Example

```typescript
interface QueryParams {
  page?: number;
  limit?: number;
  sort?: string;
  filters?: Record<string, string>;
}

function buildQuery(params: QueryParams) {
  const { page = 1, limit = 20, sort, filters } = params;

  // Build sort
  const sortFields = sort?.split(',').map(field => {
    const [key, direction] = field.split(':');
    return { [key]: direction || 'asc' };
  }) || [{ createdAt: 'desc' }];

  // Build where clause
  const where = Object.entries(filters || {}).reduce((acc, [key, value]) => {
    if (key.startsWith('min_')) {
      const field = key.replace('min_', '');
      acc[field] = { ...acc[field], gte: parseValue(value) };
    } else if (key.startsWith('max_')) {
      const field = key.replace('max_', '');
      acc[field] = { ...acc[field], lte: parseValue(value) };
    } else {
      acc[key] = value;
    }
    return acc;
  }, {});

  return { skip: (page - 1) * limit, take: limit, where, orderBy: sortFields };
}
```

## Error Handling

Consistent error responses are essential:

```typescript
// Error response format
interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    requestId: string;
  };
}
```

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "email": "Must be a valid email address",
      "age": "Must be a positive number"
    },
    "requestId": "req_abc123"
  }
}
```

### Standard Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Input validation failed |
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource doesn't exist |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

## Versioning Strategies

### URI Versioning (Most Common)

```
/api/v1/users
/api/v2/users
```

Pros: Clear, easy to cache, simple to understand
Cons: URL pollution over time

### Header Versioning

```http
GET /api/users HTTP/1.1
Accept: application/vnd.company.v1+json
```

Pros: Cleaner URLs, flexible
Cons: Harder to test, less visible

### Recommended: URI Versioning with Deprecation

```typescript
// Express.js example
app.get('/api/v1/users', (req, res) => {
  res.set('Deprecation', 'true');
  res.set('Link', '<https://api.example.com/api/v2/users>; rel="successor-version"');
  // Handle v1 logic
});

app.get('/api/v2/users', (req, res) => {
  // Handle v2 logic
});
```

## Rate Limiting

Essential for protecting your API:

```typescript
// Redis-based rate limiter
const RATE_LIMIT_WINDOW = 60; // seconds
const MAX_REQUESTS = 100;

async function checkRateLimit(userId: string): Promise<boolean> {
  const key = `rate_limit:${userId}`;
  const current = await redis.incr(key);

  if (current === 1) {
    await redis.expire(key, RATE_LIMIT_WINDOW);
  }

  return current <= MAX_REQUESTS;
}

// Add to your route
app.get('/api/v1/users', async (req, res) => {
  const allowed = await checkRateLimit(req.user.id);

  if (!allowed) {
    return res.status(429).json({
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many requests. Please try again later.',
        details: { retryAfter: RATE_LIMIT_WINDOW }
      }
    });
  }

  // Handle request...
});
```

## What Students Should Do Next

1. **Design an API with all these patterns** — Start with proper error handling and pagination
2. **Implement cursor-based pagination** — It's harder but scales better
3. **Add rate limiting early** — It's much harder to add later

These patterns are battle-tested across billions of requests. Use them from day one, and your API will scale gracefully.