---
applyTo: "**/*.{js,mjs,cjs,jsx}"
---
# JavaScript Guidelines

- Use ES modules (`import`/`export`) over CommonJS where supported
- Prefer `const` over `let`, never use `var`
- Use optional chaining (`?.`) and nullish coalescing (`??`)
- Prefer `async`/`await` over raw Promise chains
- Use destructuring for function parameters and object access
- Use template literals over string concatenation
- Use `Array.from()`, `.map()`, `.filter()`, `.reduce()` over manual loops where readable
- Handle errors with try/catch in async functions
- Use meaningful error messages in thrown errors
