# Contributing Guidelines

Thank you for your interest in contributing to this project! This document outlines the behavioral rules, coding standards, and development workflow for this Next.js enterprise application.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Commit Message Standards](#commit-message-standards)
- [Code Review Requirements](#code-review-requirements)
- [Testing Requirements](#testing-requirements)
- [Code Style Guidelines](#code-style-guidelines)
- [Pull Request Process](#pull-request-process)
- [Branch Naming Conventions](#branch-naming-conventions)
- [Issue Reporting](#issue-reporting)

## 🤝 Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow
- Follow the golden rule: treat others as you want to be treated

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm (preferred package manager)
- Git
- VS Code (recommended editor)

### Setup

```bash
# Clone the repository
git clone <repository-url>
cd taketwo-main

# Install dependencies
pnpm install

# Start development server
pnpm dev

# Run tests
pnpm test

# Run E2E tests
pnpm playwright test
```

## 🔄 Development Workflow

### Branch Strategy

- **`main`** - Production-ready code
- **`develop`** - Integration branch for features
- **`feature/*`** - New features and enhancements
- **`fix/*`** - Bug fixes
- **`hotfix/*`** - Critical production fixes
- **`test/*`** - Testing improvements and fixes

### Workflow Steps

1. **Create a feature branch** from `develop`
2. **Make your changes** following coding standards
3. **Write/update tests** for your changes
4. **Run the test suite** to ensure nothing breaks
5. **Commit your changes** with proper commit messages
6. **Push your branch** and create a Pull Request
7. **Address review feedback** and make necessary changes
8. **Merge after approval** and cleanup

## 📝 Commit Message Standards

We follow [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types

- **`feat`** - New features
- **`fix`** - Bug fixes
- **`perf`** - Performance improvements
- **`refactor`** - Code refactoring
- **`style`** - Code style changes (formatting, etc.)
- **`test`** - Adding or updating tests
- **`build`** - Build system changes
- **`ops`** - Operational changes
- **`docs`** - Documentation changes
- **`chore`** - Maintenance tasks
- **`merge`** - Merge commits
- **`revert`** - Reverting changes

### Examples

```bash
# Good commit messages
feat(auth): add OAuth2 integration
fix(api): resolve user validation error
test(components): add unit tests for ResidentForm
docs(readme): update installation instructions

# Bad commit messages
fix stuff
WIP
updates
```

## 👀 Code Review Requirements

### Before Submitting

    Never push directly to main.

    Always create a feature branch and open a Pull Request (PR).
    - Keep PRs small and single-purpose (target 50–300 changed lines, excluding snapshots).
    
    File Boundaries (very important)

Only modify files directly related to the stated task.

Do not touch unrelated config, lockfiles, or broad refactors unless explicitly requested.

### Review Checklist

- [ ] **Functionality** - Does the code work as intended?
- [ ] **Readability** - Is the code easy to understand?
- [ ] **Performance** - Are there any performance concerns?
- [ ] **Security** - Are there any security vulnerabilities?
- [ ] **Testing** - Is the code properly tested?
- [ ] **Documentation** - Is the code properly documented?

## 🧪 Testing Requirements

### Test Coverage

- **Unit Tests**: Minimum 80% coverage for new code
- **Integration Tests**: Required for API endpoints
- **E2E Tests**: Required for critical user workflows

### Test Types

1. **Unit Tests** - Component and utility function testing
2. **Integration Tests** - API route and service testing  
3. **E2E Tests** - Full user workflow testing

### Running Tests

```bash
# Unit tests
pnpm test

# E2E tests
pnpm playwright test

# Test coverage
pnpm test:coverage

# Specific test file
pnpm test components/ResidentForm.test.tsx
```

### Test Standards

- Write tests before or alongside code (TDD/BDD)
- Use descriptive test names
- Test both happy path and edge cases
- Mock external dependencies appropriately
- Keep tests independent and isolated

## 🎨 Code Style Guidelines

### TypeScript

- Use strict TypeScript configuration
- Prefer `interface` over `type` for object shapes
- Use explicit return types for functions
- Avoid `any` type - use proper typing

### React Components

- Use functional components with hooks
- Prefer composition over inheritance
- Use proper prop types and interfaces
- Follow the co-located testing pattern

### File Organization

```
components/
  ComponentName/
    ComponentName.tsx
    ComponentName.test.tsx
    ComponentName.stories.tsx
    index.ts
```

### Naming Conventions

- **Files**: PascalCase for components, camelCase for utilities
- **Variables**: camelCase
- **Constants**: UPPER_SNAKE_CASE
- **Functions**: camelCase with descriptive names
- **Components**: PascalCase

### Code Quality

- Keep functions small and focused (max 50 lines)
- Use meaningful variable and function names
- Add JSDoc comments for complex functions
- Remove unused imports and variables
- Use ESLint and Prettier for consistency

## 🔀 Pull Request Process

### PR Requirements

- [ ] **Title** follows conventional commit format
- [ ] **Description** clearly explains changes
- [ ] **Tests** pass and coverage is maintained
- [ ] **Documentation** updated if needed
- [ ] **Breaking changes** clearly documented
- [ ] **Screenshots** included for UI changes

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] E2E tests added/updated
- [ ] All tests pass locally

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No breaking changes (or clearly documented)
```

## 🌿 Branch Naming Conventions

### Format

```
<type>/<description>
```

### Examples

```bash
feature/user-authentication
fix/login-validation-error
test/add-resident-form-tests
docs/update-api-documentation
refactor/optimize-database-queries
```

## 🐛 Issue Reporting

### Bug Reports

When reporting bugs, please include:

- **Description** of the issue
- **Steps to reproduce** the problem
- **Expected behavior** vs actual behavior
- **Environment** details (OS, browser, Node version)
- **Screenshots** if applicable
- **Error messages** or console logs

### Feature Requests

For new features, please include:

- **Use case** and problem it solves
- **Proposed solution** or approach
- **Alternatives** considered
- **Additional context** or examples

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Documentation](https://playwright.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Conventional Commits](https://www.conventionalcommits.org/)

## ❓ Questions?

If you have questions about these guidelines or need clarification, please:

1. Check existing issues and discussions
2. Create a new issue with the `question` label
3. Reach out to the maintainers

---

**Thank you for contributing!** 🎉
