# Contributing to WolfCal

Thank you for your interest in contributing to WolfCal! This document provides guidelines and instructions for setting up your development environment and submitting contributions.

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Setup](#development-setup)
4. [Project Structure](#project-structure)
5. [Development Workflow](#development-workflow)
6. [Coding Standards](#coding-standards)
7. [Testing](#testing)
8. [Pull Request Process](#pull-request-process)
9. [Reporting Bugs](#reporting-bugs)
10. [Feature Requests](#feature-requests)

## Code of Conduct

This project adheres to a code of conduct that all contributors are expected to follow:

- Be respectful and inclusive
- Welcome newcomers and help them get started
- Focus on what is best for the community
- Show empathy towards other community members
- Accept constructive criticism gracefully

## Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** version 20 or higher
- **npm** version 10 or higher
- **Git** for version control
- A modern web browser (Chrome or Firefox recommended)
- A code editor (VS Code, WebStorm, or similar)

### Fork and Clone

1. Fork the WolfCal repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/wolfcal.git
   cd wolfcal
   ```
3. Add the upstream repository as a remote:
   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/wolfcal.git
   ```

## Development Setup

### Install Dependencies

```bash
npm install
```

This installs all required packages including React, TypeScript, Vite, and FullCalendar.

### Start Development Server

```bash
npm run dev
```

This starts Vite's development server with:
- Hot Module Replacement (HMR) for instant updates
- TypeScript compilation
- Accessible at http://localhost:5173 (note: different port from production)

**Important:** During development, you'll need to update your OAuth redirect URI in Google Cloud Console to `http://localhost:5173/callback` (not 8080).

### Build for Production

```bash
npm run build
```

This compiles TypeScript and bundles the application into the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

Serves the production build locally for testing before deployment.

### Lint Code

```bash
npm run lint
```

Runs ESLint to check for code quality issues. Fix any errors before submitting a PR.

## Project Structure

```
wolfcal/
├── src/
│   ├── components/        # Reusable React components
│   ├── pages/             # Page-level components (routing)
│   ├── lib/               # Core logic (non-UI)
│   │   ├── db/            # IndexedDB abstraction
│   │   ├── auth/          # OAuth and encryption
│   │   ├── api/           # Google Calendar API wrapper
│   │   ├── sync/          # Sync engine
│   │   └── events/        # Event utilities
│   ├── hooks/             # Custom React hooks
│   ├── App.tsx            # Root component
│   ├── main.tsx           # Application entry point
│   └── index.css          # Global styles
├── docs/                  # Documentation (markdown files)
├── public/                # Static assets (served as-is)
├── .flow/                 # Task tracking (flow-next system)
├── Dockerfile             # Production container build
├── docker-compose.yml     # Deployment configuration
├── Caddyfile              # Web server configuration
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
├── vite.config.ts         # Vite build configuration
└── eslint.config.js       # ESLint rules
```

### Key Directories

- **`src/components/`** - Reusable UI components (Calendar, Sidebar, EventDialog, etc.)
- **`src/pages/`** - Top-level page components with routing
- **`src/lib/db/`** - IndexedDB abstraction layer (schema, CRUD operations)
- **`src/lib/auth/`** - OAuth flow and token encryption logic
- **`src/lib/api/`** - Google Calendar API client (fetch wrappers)
- **`src/lib/sync/`** - Sync engine (conflict resolution, queue processing)
- **`src/hooks/`** - Custom React hooks for state management

## Development Workflow

### Branch Naming

Create a descriptive branch for your work:

```bash
git checkout -b feature/add-search-functionality
git checkout -b fix/oauth-callback-bug
git checkout -b docs/improve-setup-guide
```

**Naming conventions:**
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Adding or updating tests

### Making Changes

1. **Write code** in your feature branch
2. **Test locally** using `npm run dev`
3. **Run linter** with `npm run lint` and fix any issues
4. **Build** with `npm run build` to ensure no TypeScript errors
5. **Commit** your changes with clear, descriptive messages

### Commit Message Format

Use conventional commit format:

```
type(scope): short description

Longer description if needed (why, not what).

- Bullet points for specific changes
- Can include multiple points
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Build process or tooling changes

**Examples:**

```
feat(calendar): add search functionality

Implement search bar in calendar view that filters events by title and description.

- Add SearchBar component
- Add search state to useEvents hook
- Filter events based on search query
```

```
fix(oauth): handle redirect_uri_mismatch error

Validate OAuth redirect URI matches Google Cloud Console configuration
before attempting authorization.

- Add URI validation in oauth.ts
- Show helpful error message to user
```

### Keep Your Fork Updated

Regularly sync with the upstream repository:

```bash
git fetch upstream
git checkout main
git merge upstream/main
git push origin main
```

Rebase your feature branch on top of the latest main:

```bash
git checkout feature/your-feature
git rebase main
```

## Coding Standards

### TypeScript

- **Enable strict mode** - `tsconfig.json` has `strict: true`
- **No `any` types** - Use proper type annotations
- **Prefer interfaces** over type aliases for object shapes
- **Use `const` for immutable values** - Avoid `let` when possible
- **Export types** alongside implementation for reusability

### React

- **Functional components** - Use hooks, not class components
- **Use TypeScript** for prop types - No PropTypes library
- **Keep components small** - Single responsibility principle
- **Extract hooks** for complex logic - Don't bloat components
- **Prefer composition** over prop drilling - Use Context sparingly

### Code Style

- **2 spaces** for indentation (enforced by ESLint)
- **Semicolons required** - Consistent across codebase
- **Single quotes** for strings (enforced by ESLint)
- **Trailing commas** in multiline objects/arrays
- **Destructure** props and state - Avoid `props.x` everywhere
- **Meaningful names** - Descriptive variable/function names
- **Comments** for complex logic - Explain "why", not "what"

### File Organization

- **One component per file** - Named exports preferred
- **Group related files** - Put hooks, types, and components together
- **Index files** for public API - Re-export from `index.ts` if needed
- **Colocate tests** - `ComponentName.test.tsx` next to `ComponentName.tsx`

## Testing

### Unit Tests

WolfCal uses **Vitest** for unit testing (planned feature).

**Run tests:**
```bash
npm run test
```

**Test coverage:**
```bash
npm run test:coverage
```

### Writing Tests

Focus on testing:
- **Core sync logic** - Conflict resolution, queue processing
- **IndexedDB operations** - CRUD correctness
- **OAuth encryption** - Token security
- **Event utilities** - Recurrence parsing, validation

**Example test structure:**

```typescript
import { describe, it, expect } from 'vitest';
import { encryptToken, decryptToken } from '@/lib/auth/encryption';

describe('Token Encryption', () => {
  it('should encrypt and decrypt tokens correctly', async () => {
    const token = 'test-access-token';
    const key = await generateKey();

    const encrypted = await encryptToken(token, key);
    const decrypted = await decryptToken(encrypted, key);

    expect(decrypted).toBe(token);
  });
});
```

### Manual Testing Checklist

Before submitting a PR, manually test:

- [ ] OAuth flow (connect new account)
- [ ] Event creation (online and offline)
- [ ] Event editing (drag-and-drop and form)
- [ ] Event deletion
- [ ] Calendar filtering (toggle calendars on/off)
- [ ] Sync (manual refresh button)
- [ ] Conflict resolution (if applicable)
- [ ] Settings page (add/remove accounts)
- [ ] All three views (Month, Week, Day)
- [ ] Browser refresh (state persists)

## Pull Request Process

### Before Submitting

1. **Ensure all tests pass** - `npm run test` (when available)
2. **Lint your code** - `npm run lint` with no errors
3. **Build successfully** - `npm run build` with no errors
4. **Update documentation** - If adding features or changing behavior
5. **Rebase on main** - Ensure your branch is up-to-date
6. **Write clear commit messages** - Follow conventional commit format

### Submitting

1. **Push your branch** to your fork:
   ```bash
   git push origin feature/your-feature
   ```

2. **Open a Pull Request** on GitHub:
   - Use a clear, descriptive title
   - Reference related issues (e.g., "Fixes #123")
   - Describe what changed and why
   - Include screenshots for UI changes
   - List any breaking changes

3. **PR template** (use this format):
   ```markdown
   ## Description
   Brief summary of changes.

   ## Related Issues
   Fixes #123

   ## Changes Made
   - Bullet list of specific changes
   - Include files modified

   ## Testing
   - [ ] Manual testing completed
   - [ ] Unit tests added/updated
   - [ ] Lint passes
   - [ ] Build succeeds

   ## Screenshots (if applicable)
   [Attach images for UI changes]

   ## Breaking Changes
   List any breaking changes (or "None")
   ```

### Review Process

1. **Automated checks** run (lint, build, tests)
2. **Maintainer review** - May request changes
3. **Address feedback** - Push additional commits to your branch
4. **Approval** - Once approved, maintainer will merge

### After Merge

1. **Delete your feature branch** (on GitHub and locally)
2. **Pull latest main**:
   ```bash
   git checkout main
   git pull upstream main
   ```

## Reporting Bugs

### Before Reporting

1. **Check existing issues** - Search for duplicates
2. **Verify it's reproducible** - Ensure it's not a one-time glitch
3. **Test in latest version** - Update to latest main branch

### Bug Report Template

```markdown
## Bug Description
Clear description of the bug.

## Steps to Reproduce
1. Go to '...'
2. Click on '...'
3. Scroll to '...'
4. See error

## Expected Behavior
What you expected to happen.

## Actual Behavior
What actually happened.

## Environment
- Browser: Chrome 120 / Firefox 119 / etc.
- OS: macOS 14 / Windows 11 / Ubuntu 22.04
- WolfCal version: commit hash or release tag

## Console Errors
Paste any relevant error messages from browser console (F12 → Console).

## Screenshots
Attach screenshots if applicable.

## Additional Context
Any other relevant information.
```

## Feature Requests

We welcome feature ideas! Please:

1. **Check existing requests** - Search issues for similar ideas
2. **Describe the use case** - Why is this feature needed?
3. **Provide examples** - How would it work?
4. **Consider scope** - Is it aligned with WolfCal's goals?

### Feature Request Template

```markdown
## Feature Description
Brief summary of the proposed feature.

## Use Case
Why is this feature needed? What problem does it solve?

## Proposed Implementation
How should this feature work? (UI mockups, technical approach, etc.)

## Alternatives Considered
What other solutions did you consider?

## Additional Context
Any other relevant information.
```

## Questions?

If you have questions about contributing:

1. Check the [documentation](docs/) first
2. Search existing GitHub issues
3. Open a new issue with the "question" label
4. Join community discussions (if available)

## License

By contributing to WolfCal, you agree that your contributions will be licensed under the MIT License (same as the project).

## Thank You!

Your contributions make WolfCal better for everyone. We appreciate your time and effort!
