---
name: agentation
description: >-
  Visual feedback tool for AI coding agents (Agentation). Activated in local development
  for logged-in Admin users to provide precise UI annotations, component paths, and visual feedback.
---

# Agentation Skill Guide

Agentation is an agent-agnostic visual feedback tool integrated into this project to help developers and AI agents collaborate on UI enhancements and bug fixes.

## Configuration & Access Control

- **Library**: `agentation` (npm)
- **Component**: `<Agentation />`
- **Visibility Rules**:
  - **Local Development Only**: Conditioned on `import.meta.env.DEV` (Vite dev mode).
  - **Admin Users Only**: Only rendered when `currentUser.isLoggedIn` is `true` AND `hasAdminPermissions(currentUser.role)` is `true` (roles: `ॲडमिन`, `Admin`, `अध्यक्ष`, `खजिनदार`, `उपखजिनदार`).

## Code Integration Location

- Integrated in [`src/App.tsx`](file:///c:/Users/SigmaDesign/Documents/moryagroupweb/src/App.tsx):

```tsx
import { Agentation } from 'agentation';

{/* Agentation Visual Feedback Toolbar - Local Development & Admin User Only */}
{import.meta.env.DEV && currentUser?.isLoggedIn && hasAdminPermissions(currentUser?.role) && (
  <Agentation />
)}
```

## How to Use Agentation Feedback

1. Run the local dev server (`npm run dev`).
2. Log in as an Admin user (e.g. अध्यक्ष / ॲडमिन / खजिनदार).
3. Use the floating Agentation toolbar to:
   - Click on elements to create visual annotations.
   - Select text or areas to provide exact feedback.
   - Pause CSS/JS animations to capture precise UI frames.
   - Copy or submit generated Markdown snippets containing exact CSS selectors, element hierarchies, and feedback context for AI agents.
