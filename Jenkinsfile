pipeline {
    agent {
        label 'rootless-docker'
    }

    environment {
        REGISTRY = 'ghcr.io'
        FRONTEND_IMAGE = 'ghcr.io/mohamadazeem/student-task-frontend:latest'
        BACKEND_IMAGE = 'ghcr.io/mohamadazeem/student-task-backend:latest'
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Backend Tests') {
            steps {
                sh '''
                    docker run --rm \
                      -v "$WORKSPACE/backend:/app" \
                      -w /app \
                      -e JWT_SECRET=test-only-secret \
                      node:24-bookworm-slim \
                      sh -c "npm ci && npm test"
                '''
            }
        }

        stage('Build Docker Images') {
            steps {
                sh '''
                    docker build -t $FRONTEND_IMAGE ./frontend
                    docker build -t $BACKEND_IMAGE ./backend
                '''
            }
        }

        stage('Push Images to GHCR') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'ghcr-creds',
                        usernameVariable: 'GHCR_USER',
                        passwordVariable: 'GHCR_TOKEN'
                    )
                ]) {
                    sh '''
                        set +x
                        echo "$GHCR_TOKEN" | docker login ghcr.io \
                            -u "$GHCR_USER" --password-stdin

                        docker push $FRONTEND_IMAGE
                        docker push $BACKEND_IMAGE
                    '''
                }
            }
        }

        stage('Deploy') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'ghcr-creds',
                        usernameVariable: 'GHCR_USER',
                        passwordVariable: 'GHCR_TOKEN'
                    )
                ]) {
                    sh '''
                        set +x

                        ln -sfn "$HOME/.config/student-task-manager/deploy.env" backend/.env

                        echo "$GHCR_TOKEN" | docker login ghcr.io \
                            -u "$GHCR_USER" --password-stdin

                        docker compose \
                            --env-file "$HOME/.config/student-task-manager/deploy.env" \
                            pull frontend backend

                        docker compose \
                            --env-file "$HOME/.config/student-task-manager/deploy.env" \
                            up -d --no-build

                        docker logout ghcr.io
                    '''
                }
            }
        }
    }

    post {
        success {
            echo 'Student Task Manager deployed successfully!'
        }

        failure {
            echo 'Pipeline failed. Check the Jenkins console output.'
        }
    }
}
