import type { KnowledgeSection } from "@/views/learning/develop/react/react-knowledge.types";

export const k8sSection: KnowledgeSection = {
  id: "k8s",
  title: "Kubernetes",
  icon: "Boxes",
  description: "Kubernetes fundamentals: Pods, Deployments, Services, Scaling resources, and Health checks.",
  style: {
    iconColor: "text-indigo-500",
    headerBg: "bg-indigo-500/10 dark:bg-indigo-500/[0.08]",
    headerBorder: "border-indigo-500/20 dark:border-indigo-500/30",
    accentBorder: "border-indigo-500/50 dark:border-indigo-500/30",
    sidebarBg: "bg-indigo-500/10",
    sidebarText: "text-indigo-700 dark:text-indigo-300",
  },
  items: [
    {
      id: "k8s-core-concepts",
      title: "Core Concepts",
      summary: "Pods, Nodes, Clusters, Namespaces — the foundational building blocks of Kubernetes.",
      tags: ["Pod", "Node", "Cluster", "Namespace", "Control Plane", "kubelet"],
      body: "**Cluster**: The entire Kubernetes operational environment, composed of the Control Plane and Worker Nodes.\n\n**Control Plane** (Master): Coordinates the overall cluster state.\n- `kube-apiserver`: The central REST API gateway — all cluster commands route through here.\n- `etcd`: Distributed key-value store holding the source-of-truth cluster configuration data.\n- `kube-scheduler`: Schedules newly declared Pods to specific Worker Nodes based on capacity constraints.\n- `kube-controller-manager`: Runs essential controllers (ReplicaSets, Deployments, etc.).\n\n**Worker Node**: The machine hosts executing containers.\n- `kubelet`: Node agent verifying container states match specs passed by the API server.\n- `kube-proxy`: Directs internal and external network routing requests (Services).\n- `Container Runtime`: System engine executing containers (containerd, CRI-O).\n\n**Pod**: The smallest deployable computing unit. Houses one or more containers sharing shared storage/network namespaces. Pods are ephemeral — when they fail, they are replaced rather than repaired.\n\n**Namespace**: Virtual clusters inside a physical cluster, separating environments (dev, staging, prod) or teams.",
      subtopics: [
        {
          title: "kubectl basics",
          body: "Frequently used commands for inspecting resources in your daily workflow.",
          codeExample: {
            language: "bash",
            code: `# Inspect active resources in a specific namespace
kubectl get pods,svc,deploy -n my-app

# Inspect detailed Pod information (events, lifecycle logs, resource stats)
kubectl describe pod my-pod-xyz -n my-app

# Stream container stdout logs
kubectl logs my-pod-xyz -n my-app --tail=100 -f

# Spawn a shell inside a running container
kubectl exec -it my-pod-xyz -n my-app -- /bin/sh

# Forward a local port to a cluster Pod port for debugging
kubectl port-forward pod/my-pod-xyz 8080:3000 -n my-app

# Apply resource specifications from a YAML manifest
kubectl apply -f deployment.yaml

# Delete a specific cluster resource
kubectl delete pod my-pod-xyz -n my-app`,
          },
        },
        {
          title: "Pod Manifest",
          body: "The basic structure of a Pod resource declaration YAML.",
          codeExample: {
            language: "bash",
            code: `# pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: my-app
  namespace: production
  labels:
    app: my-app
    version: "1.0"
spec:
  containers:
    - name: app
      image: my-app:1.0.0
      ports:
        - containerPort: 3000
      env:
        - name: NODE_ENV
          value: production
        - name: DB_URL
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: url
      resources:
        requests:
          cpu: "100m"
          memory: "128Mi"
        limits:
          cpu: "500m"
          memory: "512Mi"`,
          },
        },
      ],
    },
    {
      id: "k8s-workloads",
      title: "Workloads",
      summary: "Deployments, ReplicaSets, StatefulSets, DaemonSets — selecting the right workload model.",
      tags: ["Deployment", "ReplicaSet", "StatefulSet", "DaemonSet", "Job", "CronJob"],
      body: "**Deployment**: The standard workload strategy for managing stateless applications. Manages ReplicaSets and coordinates zero-downtime rolling updates and rollbacks.\n\n**ReplicaSet**: Guarantees that a specified number of Pod replicas remain active. Usually configured indirectly via Deployment specs.\n\n**StatefulSet**: Designed for applications requiring state persistence (e.g. databases, queues). Guarantees stable network IDs (`pod-0`, `pod-1`), ordered scale-up/down, and persistent storage mapping per instance.\n\n**DaemonSet**: Schedules a single Pod copy to every Worker Node — ideal for logging systems (Fluentd), node monitoring (Datadog), or network mesh components.\n\n**Job**: Executes containers to completion for tasks like db migrations or batch queries.\n\n**CronJob**: Executes Jobs periodically according to a cron schedule.",
      subtopics: [
        {
          title: "Deployment with Rolling Update",
          body: "Deploying applications with zero downtime using rolling updates.",
          codeExample: {
            language: "bash",
            code: `# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1   # Max number of down pods during updates
      maxSurge: 1         # Max number of temporary extra pods allowed
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: app
          image: my-app:2.0.0  # updating this tag triggers a rolling rollout
          # ... (ports, env, resources)

# Rollback deployment in case of failures
# kubectl rollout undo deployment/my-app -n production
# kubectl rollout history deployment/my-app -n production`,
          },
        },
        {
          title: "Rollout Commands",
          body: "Monitor, view history, or trigger rollback events for Deployments.",
          codeExample: {
            language: "bash",
            code: `# Monitor rollout progress live
kubectl rollout status deployment/my-app -n production

# View revision history
kubectl rollout history deployment/my-app -n production

# Rollback to the immediate previous revision
kubectl rollout undo deployment/my-app -n production

# Rollback to a specific historical revision ID
kubectl rollout undo deployment/my-app --to-revision=2 -n production

# Restart all pods to trigger image pulls
kubectl rollout restart deployment/my-app -n production`,
          },
        },
      ],
    },
    {
      id: "k8s-networking",
      title: "Networking",
      summary: "Service types (ClusterIP, NodePort, LoadBalancer), Ingress configurations, and DNS in Kubernetes.",
      tags: ["Service", "ClusterIP", "LoadBalancer", "Ingress", "DNS", "Ingress Controller"],
      body: "**Service**: An abstraction representing a group of Pods. Delivers stable IP and DNS mapping even as matching Pods are rescheduled.\n\n**ClusterIP** (Default): Restricts access exclusively within the cluster boundaries. Used for private service-to-service calls.\n\n**NodePort**: Exposes the service on a dedicated port range (30000-32767) across all cluster Nodes, enabling external testing access via `<NodeIP>:<NodePort>`.\n\n**LoadBalancer**: Automatically provisions cloud load balancers. Creating a dedicated cloud load balancer per service can be expensive. Prefer Ingress wrappers in production.\n\n**Ingress**: Defines routing rules mapping HTTP/HTTPS traffic to Services based on hostname or path routing configurations. Managed via an **Ingress Controller** (e.g. nginx-ingress, Traefik).\n\n**DNS**: Kubernetes hosts internal DNS endpoints (CoreDNS). Service DNS format: `<service>.<namespace>.svc.cluster.local`. Pods resolve via `<pod-ip>.<namespace>.pod.cluster.local`.",
      subtopics: [
        {
          title: "Service + Ingress",
          body: "Standard architecture: Combine ClusterIP Services with a single Ingress Controller to route external HTTP requests.",
          codeExample: {
            language: "bash",
            code: `# service.yaml
apiVersion: v1
kind: Service
metadata:
  name: my-app-svc
  namespace: production
spec:
  selector:
    app: my-app        # matches Pod labels
  ports:
    - port: 80         # Port exposed by the Service
      targetPort: 3000 # Port exposed by the container
  type: ClusterIP      # private internal port only

---
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-app-ingress
  namespace: production
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  ingressClassName: nginx
  tls:
    - hosts: [app.example.com]
      secretName: tls-secret
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: my-app-svc
                port:
                  number: 80`,
          },
        },
      ],
    },
    {
      id: "k8s-config-secrets",
      title: "Config & Secrets",
      summary: "ConfigMaps and Secrets — injection patterns via environment variables or volume mounts.",
      tags: ["ConfigMap", "Secret", "env vars", "volume mount", "sealed secrets"],
      body: "**ConfigMap**: Stores non-sensitive, raw key-value configuration values (such as application flags or property files).\n\n**Secret**: Stores sensitive parameters (credentials, TLS keys). Values are base64-encoded, not encrypted by default. Secure secrets by enabling encryption-at-rest (using etcd keys, Bitnami Sealed Secrets, or Vault).\n\n**Injection via Env Variables**: Straightforward injection pattern but lacks hot-reloading support, requiring container restarts to pick up updates.\n\n**Injection via Volume Mounts**: Mounts ConfigMaps/Secrets as local files. Supports hot-reloading (app-dependent), ideal for reloading updated certificates or configurations.\n\n**Sealed Secrets**: Encrypts Secrets with public keys, making them safe to check into Git. The cluster-level operator decrypts them upon application.\n\n**External Secrets Operator**: Synchronizes secrets from external providers (e.g. AWS Secrets Manager, GCP Secret Manager, Vault) into native K8s Secret resources.",
      subtopics: [
        {
          title: "ConfigMap & Secret manifest",
          body: "Creating configuration resources and injecting them into workloads.",
          codeExample: {
            language: "bash",
            code: `# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: production
data:
  NODE_ENV: production
  LOG_LEVEL: info
  APP_URL: https://app.example.com

---
# secret.yaml (values must be base64-encoded)
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
  namespace: production
type: Opaque
stringData:           # stringData handles base64 conversion automatically
  DB_PASSWORD: "my-secure-password"
  JWT_SECRET: "my-jwt-secret"

---
# Injecting configs into a Deployment
spec:
  containers:
    - name: app
      envFrom:
        - configMapRef:
            name: app-config    # loads all configmap values as env vars
        - secretRef:
            name: app-secrets   # loads all secrets as env vars`,
          },
        },
      ],
    },
    {
      id: "k8s-scaling",
      title: "Scaling & Resources",
      summary: "Resource requests/limits, HPA (Horizontal Pod Autoscaler), and VPA autoscaling.",
      tags: ["HPA", "VPA", "resource limits", "requests", "autoscaling", "replicas"],
      body: "**Resource Requests**: The minimum CPU/Memory allocated to a Pod. Used by the scheduler to find a Node with matching capacity.\n\n**Resource Limits**: The maximum CPU/Memory a Pod can consume. Crossing limits triggers CPU throttling or Out-Of-Memory (OOM) termination.\n\n**Best Practice**: Match memory requests and limits (`requests = limits`) to avoid node overcommit. Avoid setting CPU limits too low.\n\n**HPA (Horizontal Pod Autoscaler)**: Automatically adjusts Pod replica counts based on metrics like CPU, memory, or custom cues. Requires `metrics-server` to be running inside the cluster.\n\n**VPA (Vertical Pod Autoscaler)**: Adjusts resource limits and requests dynamically (typically restarts containers). Run VPA in `Off` mode first to gather sizing recommendations.\n\n**KEDA (Kubernetes Event-driven Autoscaling)**: Extends HPA by scaling workloads based on event sources (like database query logs, Kafka streams, or cron schedules).",
      subtopics: [
        {
          title: "HPA manifest",
          body: "Automatically scaling replicas when average CPU usage crosses 70%.",
          codeExample: {
            language: "bash",
            code: `# hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: my-app-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-app
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70   # scale up if CPU usage > 70%
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80

# Check active HPA metrics
# kubectl get hpa -n production
# kubectl describe hpa my-app-hpa -n production`,
          },
        },
      ],
    },
    {
      id: "k8s-health",
      title: "Health & Observability",
      summary: "Liveness, Readiness, and Startup probes — ensuring containers are healthy and ready to route traffic.",
      tags: ["liveness probe", "readiness probe", "startup probe", "health check", "logs", "kubectl"],
      body: "**Liveness Probe**: Instructs Kubernetes to restart containers if checks fail, resolving deadlocks. Target a lightweight `/healthz` check, bypassing external databases.\n\n**Readiness Probe**: Detaches Pods from matching Service endpoints if checks fail, preventing traffic routing while the pod is warm-loading or busy. Unlike liveness, this does not restart containers.\n\n**Startup Probe**: Postpones liveness and readiness evaluations for slow-starting applications until initialization completes, preventing premature terminations.\n\n**Probe Mechanisms**:\n- `httpGet`: Issues HTTP queries to check response status codes.\n- `tcpSocket`: Checks if a specific TCP port is open.\n- `exec`: Runs custom commands within the container context; an exit status of `0` signals success.\n\n**Logging**: Containers write logs to stdout/stderr. Kubernetes gathers these for retrieval via `kubectl logs`. In production, ship logs to a centralized logger (e.g. Loki, ELK, Datadog).",
      subtopics: [
        {
          title: "Probe configuration",
          body: "Configuring startup, liveness, and readiness probes on a container definition.",
          codeExample: {
            language: "bash",
            code: `# Container configuration snippet:
containers:
  - name: app
    image: my-app:1.0.0

    startupProbe:
      httpGet:
        path: /healthz
        port: 3000
      failureThreshold: 30    # 30 attempts * 10s = up to 5 minutes allowed for startup
      periodSeconds: 10

    livenessProbe:
      httpGet:
        path: /healthz
        port: 3000
      initialDelaySeconds: 0  # startupProbe handles startup delay
      periodSeconds: 30
      failureThreshold: 3
      timeoutSeconds: 5

    readinessProbe:
      httpGet:
        path: /ready           # checks if DB connections and caches are initialized
        port: 3000
      periodSeconds: 10
      failureThreshold: 3
      successThreshold: 1`,
          },
        },
        {
          title: "Health endpoints in Next.js",
          body: "Setting up lightweight `/healthz` and `/ready` validation routes.",
          codeExample: {
            language: "typescript",
            code: `// app/api/healthz/route.ts — liveness check
export async function GET() {
  return Response.json({ status: "ok" });
}

// app/api/ready/route.ts — readiness check
export async function GET() {
  try {
    // Assert database connection viability
    await prisma.$queryRaw\`SELECT 1\`;
    return Response.json({ status: "ready", db: "ok" });
  } catch {
    return Response.json(
      { status: "not ready", db: "error" },
      { status: 503 }
    );
  }
}`,
          },
        },
      ],
    },
  ],
};
