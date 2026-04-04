# 28-Month Blog Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace existing 2 blog posts with 28 new MDX posts (Jan 2024 - Apr 2026), all authored by Ravali, with enhanced blog index and detail page UX.

**Architecture:**
- Content: 28 MDX posts in `src/content/blog/` with SEO-optimized frontmatter
- Index: Enhanced search/filter in `src/pages/blog/index.astro`
- Detail: Related posts logic already implemented in `src/pages/blog/[slug].astro`
- Each post includes personal experience section, actionable next steps, and interactive blocks

**Tech Stack:** Astro, MDX, Tailwind CSS (existing)

---

## Batch 1: Latest Content (Apr 2026 - Oct 2025)

### Task 1: Generate Batch 1 Posts (7 posts)

**Files:**
- Create: `src/content/blog/apr-2026-ai-web-development.mdx`
- Create: `src/content/blog/mar-2026-serverless-architecture.mdx`
- Create: `src/content/blog/feb-2026-nextjs-app-router-deep-dive.mdx`
- Create: `src/content/blog/jan-2026-state-management-2026.mdx`
- Create: `src/content/blog/dec-2025-portfolio-review.mdx`
- Create: `src/content/blog/nov-2025-edge-functions-guide.mdx`
- Create: `src/content/blog/oct-2025-react-19-features.mdx`

- [ ] **Step 1: Create Apr 2026 post - "AI and Web Development: A Practical Guide for Students"**

```mdx
---
title: "AI and Web Development: A Practical Guide for Students"
description: "Learn how to integrate AI tools into your web development workflow. Real-world examples, tool recommendations, and step-by-step guides for students."
pubDate: 2026-04-15
author: "Ravali"
authorRole: "Software Engineer & Content Creator"
authorBio: "Ravali writes practical engineering guides for students and developers, combining hands-on project stories, career lessons, and trend-focused technical research."
category: "AI & Machine Learning"
tags: ["AI", "Web Development", "Tools", "Student Guide"]
heroImage: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200&h=600&fit=crop"
readTime: 8
draft: false
---

## My Experience

When I first started coding, I spent hours debugging simple issues that AI tools could have solved in seconds...

## What Students Should Do Next

1. Sign up for GitHub Copilot (free for students)
2. Experiment with Cursor IDE for a week
3. Build a small project using an AI API

## Interactive Checklist

- [ ] Set up AI coding assistant
- [ ] Complete one project with AI help
- [ ] Document what AI helped you learn
```

- [ ] **Step 2: Create remaining 6 posts for Batch 1** (follow same pattern with varied topics)

- [ ] **Step 3: Run build validation**

```bash
cd /home/astra/Desktop/Techmigos_Website./Techmigos_Website && npm run build
```

Expected: Build succeeds with all 7 new posts generated

- [ ] **Step 4: Commit Batch 1**

```bash
git add src/content/blog/apr-2026-*.mdx src/content/blog/mar-2026-*.mdx src/content/blog/feb-2026-*.mdx src/content/blog/jan-2026-*.mdx src/content/blog/dec-2025-*.mdx src/content/blog/nov-2025-*.mdx src/content/blog/oct-2025-*.mdx
git commit -m "feat: add 7 blog posts (Apr 2026 - Oct 2025)

- AI and Web Development guide for students
- Serverless architecture deep dive
- Next.js App Router patterns
- State management 2026 comparison
- Portfolio review techniques
- Edge functions practical guide
- React 19 features overview

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Batch 2: Mid 2025 (Sep 2025 - Mar 2025)

### Task 2: Generate Batch 2 Posts (7 posts)

**Files:**
- Create: `src/content/blog/sep-2025-typescript-best-practices.mdx`
- Create: `src/content/blog/aug-2025-css-container-queries.mdx`
- Create: `src/content/blog/jul-2025-micro-frontends.mdx`
- Create: `src/content/blog/jun-2025-api-design-patterns.mdx`
- Create: `src/content/blog/may-2025-performance-optimization.mdx`
- Create: `src/content/blog/apr-2025-testing-strategies.mdx`
- Create: `src/content/blog/mar-2025-database-design.mdx`

- [ ] **Step 1: Create Sep 2025 post - "TypeScript Best Practices for 2025"**

- [ ] **Step 2: Create remaining 6 posts for Batch 2**

- [ ] **Step 3: Run build validation**

```bash
npm run build
```

Expected: Build succeeds with all 14 posts total

- [ ] **Step 4: Commit Batch 2**

```bash
git add src/content/blog/sep-2025-*.mdx src/content/blog/aug-2025-*.mdx src/content/blog/jul-2025-*.mdx src/content/blog/jun-2025-*.mdx src/content/blog/may-2025-*.mdx src/content/blog/apr-2025-*.mdx src/content/blog/mar-2025-*.mdx
git commit -m "feat: add 7 blog posts (Sep 2025 - Mar 2025)

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Batch 3: 2024 Full Year (Feb 2025 - Aug 2024)

### Task 3: Generate Batch 3 Posts (7 posts)

**Files:**
- Create: `src/content/blog/feb-2025-ai-agent-development.mdx`
- Create: `src/content/blog/jan-2025-web-security-essentials.mdx`
- Create: `src/content/blog/dec-2024-year-review-tech.mdx`
- Create: `src/content/blog/nov-2024-pwa-2024.mdx`
- Create: `src/content/blog/oct-2024-git-workflows.mdx`
- Create: `src/content/blog/sep-2024-cloud-deployment.mdx`
- Create: `src/content/blog/aug-2024-responsive-design.mdx`

- [ ] **Step 1: Create Feb 2025 post - "Building AI Agents: A Student Developer's Guide"**

- [ ] **Step 2: Create remaining 6 posts for Batch 3**

- [ ] **Step 3: Run build validation**

```bash
npm run build
```

Expected: Build succeeds with all 21 posts total

- [ ] **Step 4: Commit Batch 3**

```bash
git add src/content/blog/feb-2025-*.mdx src/content/blog/jan-2025-*.mdx src/content/blog/dec-2024-*.mdx src/content/blog/nov-2024-*.mdx src/content/blog/oct-2024-*.mdx src/content/blog/sep-2024-*.mdx src/content/blog/aug-2024-*.mdx
git commit -m "feat: add 7 blog posts (Feb 2025 - Aug 2024)

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Batch 4: Early 2024 (Jul 2024 - Jan 2024)

### Task 4: Generate Batch 4 Posts (7 posts)

**Files:**
- Create: `src/content/blog/jul-2024-javascript-es2024.mdx`
- Create: `src/content/blog/jun-2024-static-site-generators.mdx`
- Create: `src/content/blog/may-2024-first-portfolio.mdx`
- Create: `src/content/blog/apr-2024-debugging-tips.mdx`
- Create: `src/content/blog/mar-2024-vscode-extensions.mdx`
- Create: `src/content/blog/feb-2024-apis-rest-graphql.mdx`
- Create: `src/content/blog/jan-2024-web-dev-getting-started.mdx`

- [ ] **Step 1: Create Jul 2024 post - "JavaScript ES2024: What's New for Students"**

- [ ] **Step 2: Create remaining 6 posts for Batch 4**

- [ ] **Step 3: Run build validation**

```bash
npm run build
```

Expected: Build succeeds with all 28 posts total

- [ ] **Step 4: Commit Batch 4**

```bash
git add src/content/blog/jul-2024-*.mdx src/content/blog/jun-2024-*.mdx src/content/blog/may-2024-*.mdx src/content/blog/apr-2024-*.mdx src/content/blog/mar-2024-*.mdx src/content/blog/feb-2024-*.mdx src/content/blog/jan-2024-*.mdx
git commit -m "feat: add 7 blog posts (Jul 2024 - Jan 2024)

Complete 28-month blog expansion with posts from Jan 2024 to Apr 2026.
All posts by Ravali with portfolio, trends, and future-focused content.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Blog UI Enhancements

### Task 5: Enhance Blog Index Search/Filter

**Files:**
- Modify: `src/pages/blog/index.astro`

- [ ] **Step 1: Enhance search input with debouncing**

Add 300ms debounce to search input to improve performance with larger post set.

```javascript
// Add to existing script
let searchTimeout;
searchInput?.addEventListener('input', (event) => {
  const target = event.target;
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    if (target instanceof HTMLInputElement) {
      query = target.value.trim().toLowerCase();
      applyFilters();
    }
  }, 300);
});
```

- [ ] **Step 2: Add keyboard navigation for filters**

Allow Enter to apply current search, Escape to clear.

- [ ] **Step 3: Run build and verify**

```bash
npm run build
```

- [ ] **Step 4: Commit UI enhancements**

```bash
git add src/pages/blog/index.astro
git commit -m "feat: enhance blog index with debounced search and keyboard nav

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Verification Tasks

### Task 6: Final Verification

- [ ] **Step 1: Run complete build**

```bash
npm run build
```

Expected: Success, all 28 posts generated

- [ ] **Step 2: Verify post count**

```bash
ls -la src/content/blog/*.mdx | wc -l
```

Expected: 28

- [ ] **Step 3: Verify date range**

Check that posts span Jan 2024 to Apr 2026 with no gaps

- [ ] **Step 4: Verify all posts have Ravali as author**

```bash
grep -L "author: \"Ravali\"" src/content/blog/*.mdx
```

Expected: No output (all have Ravali)

- [ ] **Step 5: Verify categories and tags are populated**

Each post should have category and at least 3 tags

---

## Post Generation Topics Reference

| Month | Topic | Type |
|-------|-------|------|
| Apr 2026 | AI and Web Development | Trends |
| Mar 2026 | Serverless Architecture Deep Dive | Future |
| Feb 2026 | Next.js App Router Patterns | Tutorial |
| Jan 2026 | State Management 2026 | Trends |
| Dec 2025 | Building a Portfolio That Works | Portfolio |
| Nov 2025 | Edge Functions Practical Guide | Tutorial |
| Oct 2025 | React 19 Features Overview | Trends |
| Sep 2025 | TypeScript Best Practices | Tutorial |
| Aug 2025 | CSS Container Queries | Tutorial |
| Jul 2025 | Micro Frontends Explained | Future |
| Jun 2025 | API Design Patterns | Tutorial |
| May 2025 | Web Performance Optimization | Tutorial |
| Apr 2025 | Testing Strategies for Projects | Tutorial |
| Mar 2025 | Database Design Fundamentals | Tutorial |
| Feb 2025 | Building AI Agents | Trends |
| Jan 2025 | Web Security Essentials | Tutorial |
| Dec 2024 | Year in Review: Tech Trends | Trends |
| Nov 2024 | PWA in 2024 | Trends |
| Oct 2024 | Git Workflows for Teams | Tutorial |
| Sep 2024 | Cloud Deployment Guide | Tutorial |
| Aug 2024 | Responsive Design 2024 | Tutorial |
| Jul 2024 | JavaScript ES2024 | Trends |
| Jun 2024 | Static Site Generators | Trends |
| May 2024 | Building Your First Portfolio | Portfolio |
| Apr 2024 | Debugging Tips & Tricks | Tutorial |
| Mar 2024 | VS Code Extensions for Productivity | Tutorial |
| Feb 2024 | REST vs GraphQL APIs | Tutorial |
| Jan 2024 | Getting Started in Web Dev | Tutorial |

---

**Plan Complete**

Total: 6 tasks, ~28 steps across content generation, UI enhancements, and verification.