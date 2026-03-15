---
applyTo: "**/*.{yml,yaml}"
---
# YAML / GitHub Actions Guidelines

- Use 2-space indentation consistently
- Quote strings that could be interpreted as numbers or booleans
- For GitHub Actions: pin actions to full SHA, not tags
- Use `permissions:` block to restrict GITHUB_TOKEN scope
- Prefer reusable workflows from Ai-road-4-You/enterprise-ci-cd
- Use `concurrency:` to prevent duplicate workflow runs
- Use environment variables over hardcoded values
- Add `timeout-minutes:` to all jobs
