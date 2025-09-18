
# [Next.js Enterprise Boilerplate](https://blazity.com/open-source/nextjs-enterprise-boilerplate) 

A production-ready template for building enterprise applications with Next.js. This boilerplate provides a solid foundation with carefully selected technologies and ready-to-go infrastructure to help you develop high-quality applications efficiently.

## Motivation

While most Next.js boilerplates focus on individual developer needs with excessive complexity, **next-enterprise** prioritizes strategic simplicity for enterprise teams. It offers a streamlined foundation with high-impact features that maximize developer productivity and accelerate time-to-market for business-critical applications.

<a href="https://blazity.com/">
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="/assets/blazity-logo-dark.svg">
  <source media="(prefers-color-scheme: light)" srcset="/assets/blazity-logo-light.svg">
  <img alt="Logo" align="right" height="80" src="/assets/blazity-logo-light.svg">
</picture>
</a>

> [!NOTE]
> **Blazity** is a group of Next.js architects. We help organizations architect, optimize, and deploy high-performance Next.js applications at scale. Contact us at [contact@blazity.com](https://blazity.com) if you’d like to talk about your project.



## Documentation

There is a separate documentation that explains its functionality, highlights core business values and technical decisions, provides guidelines for future development, and includes architectural diagrams.

We encourage you to [visit our docs (docs.blazity.com)](https://docs.blazity.com) to learn more

## Integrated features

### Boilerplate
With this template you will get all the boilerplate features included:

* [Next.js 15](https://nextjs.org/) - Performance-optimized configuration using App Directory
* [Tailwind CSS v4](https://tailwindcss.com/) - Utility-first CSS framework for efficient UI development
* [ESlint 9](https://eslint.org/) and [Prettier](https://prettier.io/) - Code consistency and error prevention
* [Corepack](https://github.com/nodejs/corepack) & [pnpm](https://pnpm.io/) as the package manager - For project management without compromises 
* [Strict TypeScript](https://www.typescriptlang.org/) - Enhanced type safety with carefully crafted config and [ts-reset](https://github.com/total-typescript/ts-reset) library
* [GitHub Actions](https://github.com/features/actions) - Pre-configured workflows including bundle size and performance tracking
* Perfect Lighthouse score - Optimized performance metrics
* [Bundle analyzer](https://www.npmjs.com/package/@next/bundle-analyzer) - Monitor and manage bundle size during development
* Testing suite - [Vitest](https://vitest.dev), [React Testing Library](https://testing-library.com/react), and [Playwright](https://playwright.dev/) for comprehensive testing
* [Storybook](https://storybook.js.org/) - Component development and documentation
* Advanced testing - Smoke and acceptance testing capabilities
* [Conventional commits](https://www.conventionalcommits.org/) - Standardized commit history management
* [Observability](https://opentelemetry.io/) - Open Telemetry integration
* [Absolute imports](https://nextjs.org/docs/advanced-features/module-path-aliases) - Simplified import structure
* [Health checks](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/) - Kubernetes-compatible monitoring
* [Radix UI](https://www.radix-ui.com/) - Headless components for customization
* [CVA](http://cva.style/) (Class Variance Authority) - Consistent design system creation
* [Renovate BOT](https://www.whitesourcesoftware.com/free-developer-tools/renovate) - Automated dependency and security updates
* [Patch-package](https://www.npmjs.com/package/patch-package) - External dependency fixes without compromises
* Component relationship tools - Graph for managing coupling and cohesion
* [Semantic Release](https://github.com/semantic-release/semantic-release) - Automated changelog generation
* [T3 Env](https://env.t3.gg/) - Streamlined environment variable management

### Infrastructure & deployments

#### Vercel

Easily deploy your Next.js app with [Vercel](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=github&utm_campaign=next-enterprise) by clicking the button below:

[![Vercel](https://vercel.com/button)](https://vercel.com/new/git/external?repository-url=https://github.com/Blazity/next-enterprise)

#### Custom cloud infrastructure

**next-enterprise** offers dedicated infrastructure as code (IaC) solutions built with Terraform, designed specifically for deploying Next.js applications based on our extensive experience working with enterprise clients.

Learn more in our [documentation (docs.blazity.com)][docs] how to quickstart with the deployments using simple CLI.

#### Available cloud providers and theirs features:

* **AWS (Amazon Web Services)**
  * Automated provisioning of AWS infrastructure
  * Scalable & secure setup using:
     * VPC - Isolated network infrastructure
     * Elastic Container Service (ECS) - Container orchestration
     * Elastic Container Registry (ECR) - Container image storage
     * Application Load Balancer - Traffic distribution
     * S3 + CloudFront - Static asset delivery and caching
     * AWS WAF - Web Application Firewall protection
     * Redis Cluster - Caching
  * CI/CD ready - Continuous integration and deployment pipeline

*... more coming soon*

### Team & maintenance

**next-enterprise** is backed and maintained by [Blazity](https://blazity.com), providing up to date security features and integrated feature updates.

#### Active maintainers

- Igor Klepacki ([neg4n](https://github.com/neg4n)) - Open Source Software Developer
- Tomasz Czechowski ([tomaszczechowski](https://github.com/tomaszczechowski)) - Solutions Architect & DevOps
- Jakub Jabłoński ([jjablonski-it](https://github.com/jjablonski-it)) - Head of Integrations

#### All-time contributors
[bmstefanski](https://github.com/bmstefanski)

## Troubleshooting

### Common Webpack/Module Resolution Issues

This section covers frequent webpack-related issues that can occur during development, especially when working with complex module dependencies and hot reloading.

#### Issue: Webpack Module Resolution Errors

**Symptoms:**
- Errors like `Module not found` or `Cannot resolve module`
- Stale webpack cache errors
- Circular dependency warnings
- Hot reload failures
- `reduce@[native code]` webpack errors in browser console

**Root Causes:**
1. **Circular Dependencies**: Functions calling each other before they're defined
2. **Stale Webpack Cache**: Old module references persisting after code changes
3. **Import Order Issues**: Modules imported in incorrect order
4. **Hot Reload Conflicts**: Development server state conflicts

**Solutions:**

##### 1. Clear Webpack Cache (Most Common Fix)
```bash
# Stop the development server
pkill -f "next dev" || true

# Clear Next.js cache
rm -rf .next

# Clear node modules cache
rm -rf node_modules/.cache

# Restart development server
pnpm run dev
```

##### 2. Fix Circular Dependencies
If you see circular dependency warnings, reorganize your code:

```typescript
// ❌ BAD: Function called before definition
export const functionA = () => {
  return functionB() // functionB not defined yet
}

export const functionB = () => {
  return "hello"
}

// ✅ GOOD: Define functions before using them
export const functionB = () => {
  return "hello"
}

export const functionA = () => {
  return functionB() // functionB is now defined
}
```

##### 3. Fix Import Order Issues
Ensure imports follow the correct order:

```typescript
// ✅ GOOD: External libraries first, then internal modules
import React from 'react'
import { NextRequest } from 'next/server'

import { localFunction } from './local-module'
import type { LocalType } from './types'
```

##### 4. Development Server Reset
For persistent issues, perform a full reset:

```bash
# Clear all caches
rm -rf .next
rm -rf node_modules/.cache
rm -rf node_modules

# Reinstall dependencies
pnpm install

# Restart development server
pnpm run dev
```

##### 5. Check for Missing Exports
Ensure all imported functions are properly exported:

```typescript
// lib/utils/example.ts
export const myFunction = () => {
  // implementation
}

// ✅ GOOD: Properly exported
export { myFunction }

// ❌ BAD: Missing export
const myFunction = () => {
  // implementation
}
```

#### Issue: Hot Reload Failures

**Symptoms:**
- Changes not reflecting in browser
- "Fast Refresh" warnings in console
- Components not updating after edits

**Solutions:**
1. Clear webpack cache (see above)
2. Restart development server
3. Check for syntax errors in modified files
4. Ensure components are properly exported

#### Issue: TypeScript Module Resolution

**Symptoms:**
- TypeScript errors about missing modules
- Import path resolution failures

**Solutions:**
1. Check `tsconfig.json` path mapping
2. Verify import paths are correct
3. Restart TypeScript server in your IDE
4. Run `pnpm run build` to check for compilation errors

#### Prevention Tips

1. **Avoid Circular Dependencies**: Structure code so dependencies flow in one direction
2. **Use Consistent Import Patterns**: Follow the project's import order conventions
3. **Regular Cache Clearing**: Clear caches when switching branches or after major changes
4. **Monitor Console Warnings**: Address webpack warnings promptly
5. **Use TypeScript Strict Mode**: Catch module issues at compile time

#### When to Use Each Solution

- **First Try**: Clear webpack cache (solves 80% of issues)
- **If Cache Clearing Fails**: Check for circular dependencies
- **If Issues Persist**: Full development server reset
- **For Build Issues**: Check TypeScript configuration and import paths

#### Getting Help

If you continue experiencing webpack issues:
1. Check the browser console for specific error messages
2. Look at the terminal output for webpack warnings
3. Search for the exact error message in the project issues
4. Consider if recent changes introduced the issue

## License

MIT


[docs]: https://docs.blazity.com/next-enterprise/deployments/enterprise-cli
