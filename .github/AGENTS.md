# Agents Configuration

## Available Agents

### developer
Full-stack developer agent for homey-smart-home. Implements features, fixes bugs, writes tests.

### reviewer  
Code review agent — checks for bugs, security issues, performance, and style.

### tester
Test engineer — generates tests, runs test suites, ensures coverage targets.

### security
Security auditor — OWASP Top 10, dependency audit, secret scanning.

### deploy
Deployment agent — manages CI/CD, Docker builds, cloud deployments.

### docs
Documentation agent — keeps README, API docs, and inline docs current.

## Workflow
1. `developer` implements changes
2. `tester` writes and runs tests
3. `reviewer` reviews the code
4. `security` runs security scan
5. `deploy` handles deployment
6. `docs` updates documentation
