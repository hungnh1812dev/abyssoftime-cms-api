import type { KnowledgeSection } from "@/views/learning/develop/react/react-knowledge.types";

export const cicdSection: KnowledgeSection = {
  id: "cicd",
  title: "CI/CD",
  icon: "GitBranch",
  description: "GitHub Actions, GitLab CI, Jenkins, Docker integrations within CI pipelines, and various software deployment strategies.",
  style: {
    iconColor: "text-emerald-500",
    headerBg: "bg-emerald-500/10 dark:bg-emerald-500/[0.08]",
    headerBorder: "border-emerald-500/20 dark:border-emerald-500/30",
    accentBorder: "border-emerald-500/50 dark:border-emerald-500/30",
    sidebarBg: "bg-emerald-500/10",
    sidebarText: "text-emerald-700 dark:text-emerald-300",
  },
  items: [
    {
      id: "cicd-github-actions",
      title: "GitHub Actions",
      summary: "Workflow YAML declarations, jobs, steps, build matrices, and secrets management in GitHub Actions.",
      tags: ["GitHub Actions", "workflow", "jobs", "matrix", "secrets", "artifacts"],
      body: "**GitHub Actions** is a native CI/CD execution platform built directly into GitHub. It triggers automated workflows based on push events, pull requests, cron schedules, or manual dispatches.\n\n**Workflow**: A YAML specification located in `.github/workflows/` that dictates trigger actions and tasks.\n\n**Job**: A unit of work executed on a runner (e.g. Ubuntu, Windows, macOS). Jobs run concurrently by default; use `needs` properties to establish dependencies.\n\n**Step**: A single operation executed inside a job, running either custom terminal commands or reusable pre-built actions.\n\n**Action**: Reusable task blocks sourced from the marketplace (e.g. checking out code or setting up Node frameworks: `uses: actions/checkout@v4`).\n\n**Secrets**: Encrypted keys defined in repository settings, injected securely into tasks via `\${{ secrets.MY_SECRET }}` and hidden in build logs.\n\n**Matrix Strategy**: Executes the same job configurations simultaneously across multiple parameter configurations (such as multiple Node versions or OS types).",
      subtopics: [
        {
          title: "Basic Workflow: Test & Deploy",
          body: "A pipeline configured to execute tests on pushes or PRs, and automatically deploy when changes are merged into the main branch.",
          codeExample: {
            language: "bash",
            code: `# .github/workflows/ci.yml
name: CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: "npm"
      - run: npm ci
      - run: npm run lint
      - run: npm run test -- --coverage
      - uses: actions/upload-artifact@v4
        with:
          name: coverage
          path: coverage/

  deploy:
    needs: test          # execute only after tests pass
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'  # limit execution to the main branch
    environment: production              # links to environment secrets configuration
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run build
      - name: Deploy to Vercel
        run: npx vercel --prod --token \${{ secrets.VERCEL_TOKEN }}`,
          },
        },
        {
          title: "Matrix Strategy",
          body: "Configuring a matrix strategy to test code concurrently against multiple runtime versions and OS frameworks.",
          codeExample: {
            language: "bash",
            code: `jobs:
  test:
    strategy:
      matrix:
        node: [18, 20, 22]
        os: [ubuntu-latest, windows-latest]
      fail-fast: false   # do not cancel remaining jobs if one matrix cell fails
    runs-on: \${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: \${{ matrix.node }}
      - run: npm ci && npm test`,
          },
        },
      ],
    },
    {
      id: "cicd-gitlab",
      title: "GitLab CI/CD",
      summary: ".gitlab-ci.yml syntax, stages, runners, build artifacts, and deployment environments in GitLab.",
      tags: ["GitLab CI", ".gitlab-ci.yml", "stages", "runners", "artifacts", "environments"],
      body: "**GitLab CI/CD** is configured declaratively using a `.gitlab-ci.yml` file placed at the repository root.\n\n**Stages**: Group and order job executions. Jobs inside the same stage execute concurrently. The next stage starts only if the previous stage passes successfully (e.g. `build → test → deploy`).\n\n**Jobs**: Isolated scripts executed within a specific stage on designated runner environments (typically Docker containers).\n\n**Runners**: Agents running GitLab jobs.\n- **Shared Runners**: Managed environments provided by GitLab (often subject to credit caps).\n- **Self-managed Runners**: Installed locally on private servers, offering total control over dependencies and hardware resources.\n\n**Artifacts**: Intermediate build outputs generated by jobs that can be passed to subsequent pipeline stages or downloaded via the GitLab UI. Expires based on the `expire_in` configuration.\n\n**Environments**: Track deployments per environment tag (e.g. staging, production), listing history, access links, and quick rollbacks.",
      subtopics: [
        {
          title: "Basic .gitlab-ci.yml",
          body: "A standard pipeline structure coordinating build, test, and deploy stages.",
          codeExample: {
            language: "bash",
            code: `# .gitlab-ci.yml
stages:
  - build
  - test
  - deploy

variables:
  NODE_VERSION: "20"
  DOCKER_IMAGE: $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA

# Reusable template block
.node_setup: &node_setup
  image: node:20-alpine
  cache:
    key: $CI_COMMIT_REF_SLUG
    paths: [node_modules/]
  before_script:
    - npm ci

build:
  <<: *node_setup
  stage: build
  script:
    - npm run build
  artifacts:
    paths: [.next/]
    expire_in: 1 hour

test:
  <<: *node_setup
  stage: test
  script:
    - npm run lint
    - npm run test
  coverage: '/Lines\s*:\s*(\d+\.?\d*)%/'  # parses regex coverage ratios

deploy_staging:
  stage: deploy
  script:
    - ./scripts/deploy.sh staging
  environment:
    name: staging
    url: https://staging.example.com
  only:
    - develop

deploy_production:
  stage: deploy
  script:
    - ./scripts/deploy.sh production
  environment:
    name: production
    url: https://example.com
  only:
    - main
  when: manual  # requires human authorization before firing`,
          },
        },
        {
          title: "Self-managed Runner",
          body: "Setting up a private runner instance on Ubuntu to execute pipelines locally.",
          codeExample: {
            language: "bash",
            code: `# Install the GitLab Runner repository and package
curl -L https://packages.gitlab.com/install/repositories/runner/gitlab-runner/script.deb.sh | sudo bash
sudo apt install gitlab-runner

# Register the local runner with your GitLab instance
sudo gitlab-runner register
# → Supply GitLab Instance URL
# → Supply Registration Token (found under Settings > CI/CD > Runners)
# → Supply Runner description
# → Choose executor: docker
# → Choose default container image: node:20-alpine

# Configuration settings location: /etc/gitlab-runner/config.toml
# concurrent = 4  # max number of concurrent jobs
# [runners.docker]
#   image = "node:20-alpine"
#   volumes = ["/cache"]`,
          },
        },
      ],
    },
    {
      id: "cicd-jenkins",
      title: "Jenkins",
      summary: "Declarative Jenkinsfile design, pipeline stages, credentials store integration, and key plugins.",
      tags: ["Jenkins", "Jenkinsfile", "declarative pipeline", "credentials", "Blue Ocean"],
      body: "**Jenkins** is a self-hosted, highly customizable automation server containing an extensive plugin ecosystem.\n\n**Pipeline as Code**: Workflows are declared inside a version-controlled `Jenkinsfile` stored alongside application code.\n\n**Declarative Pipeline**: A structured, simplified syntax using `pipeline { ... }` wrappers, favored for legibility.\n\n**Scripted Pipeline**: Powered by raw Groovy code (`node { ... }` scopes), offering absolute configuration flexibility at the expense of complexity.\n\n**Stages**: Group steps into logical blocks that display as progress bars on the Jenkins dashboard dashboard UI.\n\n**Credentials**: Private API tokens and certs are handled in the Jenkins credentials store and securely bound into runtime variables via `withCredentials` helpers.\n\n**Agents**: Declare where pipeline tasks are executed, such as `any` node, nodes matching specific tags (e.g. `label 'docker'`), or directly inside Docker container contexts.",
      subtopics: [
        {
          title: "Declarative Jenkinsfile",
          body: "A complete pipeline tracking checkout, install, parallel test, build, and conditional deployment operations.",
          codeExample: {
            language: "bash",
            code: `// Jenkinsfile
pipeline {
  agent {
    docker {
      image 'node:20-alpine'
      args '-v /var/run/docker.sock:/var/run/docker.sock'
    }
  }

  environment {
    APP_NAME = 'my-app'
    DOCKER_REGISTRY = 'registry.example.com'
    REGISTRY_CREDS = credentials('docker-registry-creds')
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Install') {
      steps {
        sh 'npm ci'
      }
    }

    stage('Test') {
      parallel {
        stage('Lint') { steps { sh 'npm run lint' } }
        stage('Unit Tests') { steps { sh 'npm run test' } }
      }
    }

    stage('Build') {
      steps {
        sh 'npm run build'
        sh "docker build -t \${DOCKER_REGISTRY}/\${APP_NAME}:\${BUILD_NUMBER} ."
      }
    }

    stage('Deploy') {
      when {
        branch 'main'
      }
      steps {
        withCredentials([usernamePassword(
          credentialsId: 'docker-registry-creds',
          usernameVariable: 'USER',
          passwordVariable: 'PASS'
        )]) {
          sh "docker login -u \${USER} -p \${PASS} \${DOCKER_REGISTRY}"
          sh "docker push \${DOCKER_REGISTRY}/\${APP_NAME}:\${BUILD_NUMBER}"
        }
        sh "./scripts/deploy.sh \${BUILD_NUMBER}"
      }
    }
  }

  post {
    success { slackSend message: "✅ \${APP_NAME} deployed successfully" }
    failure { slackSend message: "❌ \${APP_NAME} pipeline execution failed" }
  }
}`,
          },
        },
      ],
    },
    {
      id: "cicd-docker",
      title: "Docker in CI",
      summary: "Building Docker images in CI, multi-stage Dockerfiles, layer caching, and pushing to registries.",
      tags: ["Docker", "multi-stage build", "layer cache", "registry", "BuildKit", "distroless"],
      body: "**Multi-Stage Dockerfile**: Compiles dependencies in heavy build containers and copies final artifacts into ultra-slim runtime containers, reducing image footprint by up to 90%.\n\n**Layer Caching**: Docker caches intermediate build instructions, executing rebuild steps only from modified layers. Best practice: Copy manifest files (`package.json`) and run installations first, then copy source directories to avoid invalidating package caches.\n\n**BuildKit**: The modern Docker build compilation engine featuring parallel build steps, robust caching, and private secret mounting capabilities (`DOCKER_BUILDKIT=1`).\n\n**Container Registries**: Securely host built images. Prominent registries include GitHub Container Registry (`ghcr.io`), GitLab Registry, Docker Hub, and cloud registries (AWS ECR, GCP Artifact Registry).\n\n**Tagging Strategies**: Use `latest` tags sparingly. Tag outputs with immutable references such as SemVer tags (`1.2.3`) or Git commit SHAs (`git-sha`).",
      subtopics: [
        {
          title: "Multi-stage Dockerfile for Next.js",
          body: "A production-grade, multi-stage Dockerfile configured to run as a secure non-root user.",
          codeExample: {
            language: "bash",
            code: `# Dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Set up a secure non-root deployment user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000

CMD ["node", "server.js"]`,
          },
        },
        {
          title: "Build & Push in GitHub Actions",
          body: "Leveraging official setup-buildx actions to build images with robust layer caching to accelerate CI runs.",
          codeExample: {
            language: "bash",
            code: `# .github/workflows/docker.yml
- name: Set up Docker Buildx
  uses: docker/setup-buildx-action@v3

- name: Log in to GHCR
  uses: docker/login-action@v3
  with:
    registry: ghcr.io
    username: \${{ github.actor }}
    password: \${{ secrets.GITHUB_TOKEN }}

- name: Build and push image
  uses: docker/build-push-action@v5
  with:
    context: .
    push: true
    tags: |
      ghcr.io/\${{ github.repository }}:latest
      ghcr.io/\${{ github.repository }}:\${{ github.sha }}
    cache-from: type=gha          # use native GitHub Action cache store
    cache-to: type=gha,mode=max`,
          },
        },
      ],
    },
    {
      id: "cicd-deployment-strategies",
      title: "Deployment Strategies",
      summary: "Blue/Green, Canary, Rolling updates, and Feature Flags — achieving safe, zero-downtime releases.",
      tags: ["blue/green", "canary", "rolling update", "feature flags", "zero downtime"],
      body: "**Rolling Updates**: Iteratively replaces old containers with new instances. Bypasses downtime, but results in dual versions running simultaneously.\n\n**Blue/Green Deployments**: Maintains two identical hosting environments. The router points traffic to the active 'Blue' stack while deployments are staged on the inactive 'Green' stack. Once verified, router pathways are switched, allowing instant rollbacks but doubling server footprint.\n\n**Canary Deployments**: Routes a small traffic fraction (e.g. 5-10%) to the new version. If error logs remain stable, the rollout is slowly scaled to 100%.\n\n**Feature Flags (Toggles)**: Decouples deployments from release gates, permitting features to be toggled on or off dynamically for specific user cohorts (via systems like LaunchDarkly, Unleash, or PostHog).\n\n**Database Migrations**: Represents the most difficult deployment challenge. Schema migrations must remain backward-compatible (e.g., the Expand-Contract pattern: adding columns, migrating data, then removing deprecated structures in separate deployments).",
      subtopics: [
        {
          title: "Canary with K8s Ingress",
          body: "Configuring canary routing to split 10% of traffic to canary endpoints using Nginx Ingress annotations.",
          codeExample: {
            language: "bash",
            code: `# canary-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-app-canary
  namespace: production
  annotations:
    nginx.ingress.kubernetes.io/canary: "true"
    nginx.ingress.kubernetes.io/canary-weight: "10"  # forwards 10% of incoming requests
spec:
  ingressClassName: nginx
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: my-app-canary-svc  # points to the canary deployment service
                port:
                  number: 80

# Incremental updates example command:
# kubectl patch ingress my-app-canary -n production \\
#   --type=json -p='[{"op":"replace","path":"/metadata/annotations/nginx.ingress.kubernetes.io~1canary-weight","value":"25"}]'`,
          },
        },
        {
          title: "Feature Flags with Unleash",
          body: "Enabling gradual rollouts or remote toggles via Unleash integrations without deploying new code.",
          codeExample: {
            language: "typescript",
            code: `// lib/flags.ts
import { UnleashClient } from "unleash-proxy-client";

const unleash = new UnleashClient({
  url: process.env.NEXT_PUBLIC_UNLEASH_URL!,
  clientKey: process.env.NEXT_PUBLIC_UNLEASH_KEY!,
  appName: "my-app",
});

export async function isFeatureEnabled(
  feature: string,
  userId?: string
): Promise<boolean> {
  await unleash.start();
  return unleash.isEnabled(feature, { userId });
}

// Consuming flags inside components
const showNewDashboard = await isFeatureEnabled("new-dashboard", user.id);`,
          },
        },
      ],
    },
    {
      id: "cicd-env-management",
      title: "Environment Management",
      summary: "Secrets and configuration management across Dev, Staging, and Prod — .env hierarchy, secret vaults, and best practices.",
      tags: [".env", "environment variables", "secrets", "vault", "dotenv-vault", "12-factor"],
      body: "**12-Factor App methodology**: Strict separation of configuration parameters from code structures. Configs must load dynamically from execution environments, allowing the identical codebase to deploy to any staging target.\n\n**.env Hierarchy** (Local configurations):\n- `.env`: Standard fallback defaults (safe to commit to version control).\n- `.env.local`: Local runtime overrides (configured in `.gitignore`).\n- `.env.development`, `.env.production`: Target-specific configurations.\n- `.env.development.local`, `.env.production.local`: Target-specific local overrides.\n\n**Crucial Policy**: Never commit `.env.local`, `.env.*.local`, or any files hosting private certificates or access tokens.\n\n**Secrets management in Production**:\n- Cloud platforms (Vercel, Netlify) provide dedicated dashboards for setting secure variables.\n- Cloud vaults (AWS Secrets Manager, GCP Secret Manager) manage enterprise keys with audit logs.\n- Doppler/Infisical offer centralized secret synchronization developer platforms.",
      subtopics: [
        {
          title: ".env best practices",
          body: "Setting up a standard .gitignore and validating variables on startup using Zod.",
          codeExample: {
            language: "bash",
            code: `# .env (committed defaults)
NEXT_PUBLIC_APP_URL=http://localhost:4000
NEXT_PUBLIC_API_URL=http://localhost:4000/api
LOG_LEVEL=debug

# .env.local (NOT committed — holds local secrets)
DATABASE_URL=postgresql://user:pass@localhost:5432/mydb
NEXTAUTH_SECRET=local-dev-secret-only-generate-32-chars
GOOGLE_CLIENT_ID=your-local-client-id
GOOGLE_CLIENT_SECRET=your-local-client-secret

# .gitignore configuration
.env.local
.env.*.local
.env.production

# src/env.ts — validates variables at startup to prevent running misconfigured builds
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),
  NEXT_PUBLIC_APP_URL: z.string().url(),
});

export const env = envSchema.parse(process.env);`,
          },
        },
        {
          title: "Secrets in GitHub Actions",
          body: "Binding secrets into workflows securely so they remain masked inside execution outputs.",
          codeExample: {
            language: "bash",
            code: `# Configure keys in: Settings > Secrets and variables > Actions
# Bind secrets into step configurations:
jobs:
  deploy:
    steps:
      - name: Execute Deployment
        env:
          DATABASE_URL: \${{ secrets.DATABASE_URL }}
          VERCEL_TOKEN: \${{ secrets.VERCEL_TOKEN }}
        run: |
          # Secrets are automatically masked as *** in GitHub logs
          npx vercel --prod --token "$VERCEL_TOKEN"

# Environment-specific secret targeting:
# Target specific environments (e.g. production environment secrets vs staging)
jobs:
  deploy:
    environment: production
    steps:
      - run: deploy-to-prod.sh
        env:
          API_KEY: \${{ secrets.API_KEY }}`,
          },
        },
      ],
    },
  ],
};
