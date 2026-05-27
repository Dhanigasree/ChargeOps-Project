# ChargeOps AWS Cloud Track

This document is for project presentation and explains the AWS cloud architecture, networking design, security model, and deployment view of the ChargeOps platform.

## Project Summary

ChargeOps is an EV charging management platform built using a microservices architecture. The system includes a React frontend, Node.js backend services, containerized deployment with Docker, Kubernetes-based orchestration, and GitOps delivery using Argo CD.

The cloud design is based on AWS services to provide secure routing, subnet-level isolation, scalability, and controlled access between the public internet and private application components.

## AWS Architecture Overview

The proposed AWS architecture includes:

- `Amazon Route 53` for DNS management
- `AWS Certificate Manager` for SSL/TLS certificate management
- `Application Load Balancer` for secure inbound HTTPS traffic
- `Amazon VPC` for isolated networking
- `Internet Gateway` for public internet access
- `NAT Gateway` for outbound private subnet internet access
- `Private and Public Subnets` across multiple zones
- `Amazon DocumentDB` as the MongoDB-compatible database tier

## VPC And Subnet Design

The network is organized inside one VPC:

- `VPC CIDR`: `10.0.0.0/16`

Public subnets:

- `Public Subnet A`: `10.0.1.0/24`
- `Public Subnet B`: `10.0.2.0/24`

Private subnets:

- `Private Subnet A`: `10.0.11.0/24`
- `Private Subnet B`: `10.0.12.0/24`

Why this design is used:

- Public subnets host internet-facing components.
- Private subnets host backend services and database resources.
- Multi-subnet design improves availability and supports fault tolerance.
- Separation of public and private layers improves security.

## Traffic Flow

The application request flow is designed as follows:

1. Users access the platform through a domain configured in `Amazon Route 53`.
2. HTTPS certificates are managed using `AWS Certificate Manager`.
3. Requests arrive at the internet-facing `Application Load Balancer`.
4. The load balancer forwards traffic to application workloads.
5. Frontend requests and API requests are routed to the appropriate services.
6. Backend services communicate internally inside the private network.
7. Database communication remains inside private subnets.
8. Private resources use the `NAT Gateway` only for outbound connectivity when needed.

## Security Design

The architecture applies layered security controls:

- Only the public entry layer is exposed to the internet.
- Backend services are not directly exposed publicly.
- Database resources stay inside private subnets.
- SSL/TLS protects client-to-application communication.
- Kubernetes `NetworkPolicy` is used for pod-to-pod traffic restriction.
- Service separation limits blast radius and improves manageability.

## Application Components

Frontend:

- `ev-frontend/`
- built with `React`
- containerized with `Docker`

Backend microservices:

- `auth-service`
- `user-service`
- `station-service`
- `booking-service`
- `payment-service`
- `review-service`
- `admin-service`
- `api-gateway`

Data layer:

- current repository setup uses MongoDB-style service deployment in Kubernetes
- presentation architecture maps this database layer to `Amazon DocumentDB`

## What Was Done In This Project

The following work has been completed in this repository:

- Designed and developed the EV charging platform frontend.
- Built backend services using `Node.js` and `Express`.
- Split the backend into independent microservices.
- Added an API gateway for request routing.
- Containerized services using `Dockerfiles`.
- Added `docker-compose` for local orchestration.
- Created Kubernetes manifests for development and production.
- Added separate manifests for frontend, backend services, database, config, secrets, and namespaces.
- Added `NetworkPolicy` resources for internal traffic control.
- Added gateway routing manifests under `k8s/gateway/`.
- Added storage configuration under `k8s/storage/`.
- Added `Argo CD` applications for GitOps-based deployment management.
- Added supporting cloud and Kubernetes documentation under `docs/`.

## Kubernetes And GitOps Mapping

This repository includes cloud-ready deployment assets:

- `k8s/dev/` for development environment deployment
- `k8s/prod/` for production environment deployment
- `argocd/` for automated synchronization
- `k8s/gateway/` for route and gateway configuration
- `k8s/storage/` for persistent storage-related configuration

This supports:

- environment separation
- repeatable deployments
- service scalability
- centralized configuration
- GitOps operations

## Why This Cloud Architecture Fits ChargeOps

- It supports a scalable microservices model.
- It separates internet-facing and internal workloads.
- It improves security for backend and database layers.
- It is easier to present because each AWS service has a clear role.
- It supports future growth and production deployment patterns.
- It aligns well with Kubernetes-based application delivery.

## Presentation Conclusion

ChargeOps demonstrates both application engineering and cloud architecture design. The project combines frontend development, backend microservices, containerization, Kubernetes orchestration, security policies, and an AWS-based network model with Route 53, ACM, ALB, VPC subnet isolation, NAT, and a private database layer. This makes it suitable for a cloud track presentation, capstone review, or architecture walkthrough.
