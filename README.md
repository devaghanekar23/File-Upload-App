# File Upload App (React + Node/Express + S3 + MySQL)

## Local run (Docker Compose)
1. `cp .env.example .env` aur values bharo (S3 bucket + AWS keys)
2. `docker compose up -d --build`
3. Browser: http://localhost  -> Register -> Upload

## AWS setup
- S3 bucket banao (Block Public Access ON rakho).
- IAM user/role policy: s3:PutObject, s3:GetObject, s3:DeleteObject on `arn:aws:s3:::BUCKET/uploads/*`.
- EC2 par run kar rahe ho to IAM Role attach karo aur AWS keys hata do.

## Kubernetes
1. Secret banao (k8s/app.yaml ke top par command hai).
2. `DOCKERHUB_USER` replace karo (Jenkinsfile + k8s/app.yaml).
3. `kubectl apply -f k8s/app.yaml` -> http://<node-ip>:30080

## Jenkins
Credentials id `dockerhub` banao, Pipeline from SCM select karo, GitHub/Bitbucket webhook lagao.
