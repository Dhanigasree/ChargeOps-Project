{{- define "chargeops.namespace" -}}
{{- default .Release.Namespace .Values.namespaceOverride -}}
{{- end -}}

{{- define "chargeops.commonLabels" -}}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: chargeops
helm.sh/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version | quote }}
{{- end -}}

{{- define "chargeops.mongoEnv" -}}
- name: MONGO_HOST
  valueFrom:
    configMapKeyRef:
      name: chargeops-config
      key: MONGO_HOST
- name: MONGO_ROOT_USERNAME
  valueFrom:
    secretKeyRef:
      name: chargeops-secrets
      key: MONGO_ROOT_USERNAME
- name: MONGO_ROOT_PASSWORD
  valueFrom:
    secretKeyRef:
      name: chargeops-secrets
      key: MONGO_ROOT_PASSWORD
{{- if .jwtSecret }}
- name: JWT_SECRET
  valueFrom:
    secretKeyRef:
      name: chargeops-secrets
      key: JWT_SECRET
{{- end }}
- name: MONGO_URI
  value: {{ printf "mongodb://$(MONGO_ROOT_USERNAME):$(MONGO_ROOT_PASSWORD)@$(MONGO_HOST):27017/%s?authSource=admin" .mongoDatabase | quote }}
{{- end -}}
