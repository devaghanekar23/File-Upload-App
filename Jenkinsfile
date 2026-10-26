pipeline {
  agent any
  environment { DH_USER = 'DOCKERHUB_USER'; TAG = "${BUILD_NUMBER}" }
  stages {
    stage('Checkout') { steps { checkout scm } }
    stage('Build Images') { steps {
      sh 'docker build -t $DH_USER/fileapp-backend:$TAG -t $DH_USER/fileapp-backend:latest backend'
      sh 'docker build -t $DH_USER/fileapp-frontend:$TAG -t $DH_USER/fileapp-frontend:latest frontend' } }
    stage('Push to Docker Hub') { steps {
      withCredentials([usernamePassword(credentialsId: 'dockerhub', usernameVariable: 'U', passwordVariable: 'P')]) {
        sh 'echo $P | docker login -u $U --password-stdin'
        sh 'docker push $DH_USER/fileapp-backend:$TAG && docker push $DH_USER/fileapp-backend:latest'
        sh 'docker push $DH_USER/fileapp-frontend:$TAG && docker push $DH_USER/fileapp-frontend:latest' } } }
    stage('Deploy to Kubernetes') { steps {
      sh 'sed "s/DOCKERHUB_USER/$DH_USER/g" k8s/app.yaml | kubectl apply -f -'
      sh 'kubectl rollout restart deployment/backend deployment/frontend'
      sh 'kubectl rollout status deployment/backend --timeout=120s' } }
  }
}
