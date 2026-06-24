# ChargeOps Helm chart (analysis/demo only)

This chart mirrors the current production workload definitions without replacing the manifests in `argocd/prod` or `k8s/prod`. It is not connected to an Argo CD Application and has not been installed into a cluster.

The consolidated workload definitions in `argocd/prod` are the source for images, tags, replicas, ports, environment references, probes, resources, service accounts, workers, and MongoDB. The ingress definitions come from `k8s/prod/ingress.yaml`.

## Safe local validation

From the repository root, render YAML locally:

```powershell
helm template chargeops ./helm/chargeops
```

Lint the chart locally:

```powershell
helm lint ./helm/chargeops
```

Neither command contacts or modifies the Kubernetes cluster. Do not run `helm install`, `helm upgrade`, or pipe the rendered output into `kubectl apply` while the existing production resources are active.

## Secret handling

Secret creation is disabled by default with `secrets.create: false`. Workloads reference the existing `chargeops-secrets` and `mongo-secret` objects. Values contain only `CHANGE_ME` placeholders; the credential-bearing `MONGO_URI` found in the legacy ConfigMap was deliberately not copied.

For a future deployment, use External Secrets, Sealed Secrets, or a private values source. Never commit real credentials to this chart.

## Important migration notes

- Resource names intentionally match the current production resources for comparison. Installing this chart now could take ownership of or alter those resources.
- The current MongoDB hostname node selector is preserved for faithful analysis but must be checked against the target cluster before any future installation.
- MongoDB expects the existing `mongodb-pvc`; PVC creation is disabled by default.
- Frontend retains its current ArgoCD-manifest `NodePort` service and fixed node port `30090`.
- Ingress rendering is enabled for comparison only. Rendering does not create an ALB.
- Argo CD Applications and sync policies are outside this chart.

