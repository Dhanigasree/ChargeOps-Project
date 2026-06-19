# ChargeOps AI Service

`ai-service` is the Agentic AI layer for ChargeOps. It exposes `POST /api/ai/chat`, uses Amazon Bedrock Converse tool calling, persists conversation memory in MongoDB collection `chat_history`, and calls existing ChargeOps microservices as tools.

## Endpoint

```http
POST /api/ai/chat
Content-Type: application/json
Authorization: Bearer <user-token>

{
  "userId": "123",
  "message": "Find charging stations near Anna Nagar"
}
```

Response:

```json
{
  "answer": "..."
}
```

## Tools

- `search_stations` calls `station-service`.
- `create_booking` calls `booking-service` with the caller's authorization header.
- `get_spending_history` calls `payment-service` and summarizes successful payments.
- `get_station_reviews` calls `review-service`.
- `get_utilization_metrics` calls `admin-service`.

## Environment

| Variable | Description |
| --- | --- |
| `PORT` | Service port. Defaults to `8008`. |
| `NODE_ENV` | Runtime environment. |
| `ALLOWED_ORIGINS` | CORS allow list. |
| `AWS_REGION` | AWS region for Bedrock and Secrets Manager. |
| `BEDROCK_MODEL_ID` | Bedrock model ID used by Converse. |
| `BEDROCK_MAX_TOKENS` | Maximum response tokens. |
| `BEDROCK_TEMPERATURE` | Model temperature. |
| `MONGO_URI` or `MONGODB_URI` | MongoDB URI for local/dev deployments. |
| `MONGODB_SECRET_ID` | Optional AWS Secrets Manager secret containing `MONGO_URI` or `MONGODB_URI`. |
| `STATION_SERVICE_URL` | Base URL for station-service. |
| `BOOKING_SERVICE_URL` | Base URL for booking-service. |
| `PAYMENT_SERVICE_URL` | Base URL for payment-service. |
| `REVIEW_SERVICE_URL` | Base URL for review-service. |
| `ADMIN_SERVICE_URL` | Base URL for admin-service. |
| `CHAT_MEMORY_LIMIT` | Number of recent conversations to include. |
| `LOG_LEVEL` | Pino log level. |

## AWS Security

Use IRSA on EKS to grant the pod permission for:

- `bedrock:InvokeModel`
- `bedrock:InvokeModelWithResponseStream`
- `secretsmanager:GetSecretValue` for the MongoDB secret
- `kms:Decrypt` for the KMS key encrypting that secret

Do not store AWS credentials, Bedrock credentials, or MongoDB passwords in source code.

## Local Run

```bash
npm install
npm run dev
```

For local testing without AWS credentials, the service falls back to simple intent routing and still uses the configured microservice URLs.
