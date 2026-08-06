# Original User Request

## 2026-08-05T10:07:47Z

Refactor Morya Group web app authentication logic: fix default auto-login bug so visitors start as logged-out guests (isLoggedIn: false), require login for administrative features, and handle credentials cleanly.

Working directory: c:\Users\SigmaDesign\Documents\moryagroupweb

Integrity mode: development

## Requirements

### R1. Default Guest Mode (Logged Out State)
Ensure that on initial application load (or when no user is saved in localStorage), the app defaults to an unauthenticated Guest user state (isLoggedIn: false). Guest visitors must be able to view public pages (Dashboard, Occasions, Profile preview) but must be prompted to log in when attempting administrative or member-specific actions.

### R2. Role-Based Permission & Login Flow
Require password authentication via LoginModal when switching to an Admin or Member account. Ensure that logged-out users can click "Login" to authenticate and receive appropriate roles (ॲडमिन, खजिनदार, अध्यक्ष, सभासद).

### R3. Code Integrity & Verification
The code must compile without errors (npm run build / TypeScript check) and preserve existing data models, UI components, and Vite configuration for deployment on GitHub Pages.

## Acceptance Criteria

### Authentication & Guest State
- [ ] Initial app load defaults to isLoggedIn: false (Guest user).
- [ ] Administrative views/actions prompt for authentication when unauthenticated.
- [ ] Logging out resets state to Guest mode cleanly.

### Build & Verification
- [ ] Project builds cleanly (npm run build) without TypeScript or Vite errors.
