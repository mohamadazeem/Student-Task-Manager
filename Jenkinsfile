pipeline {
    agent {
        label 'rootless-docker'
    }

    options {
        disableConcurrentBuilds()
        timeout(time: 30, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '10'))
        skipDefaultCheckout(true)
    }

    triggers {
        pollSCM('H/5 * * * *')
    }

    environment {
        REGISTRY = 'ghcr.io'
        FRONTEND_IMAGE = 'ghcr.io/mohamadazeem/student-task-frontend:latest'
        BACKEND_IMAGE = 'ghcr.io/mohamadazeem/student-task-backend:latest'
        DEPLOY_ENV = '/home/user/.config/student-task-manager/deploy.env'
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Check Configuration') {
            steps {
                script {
                    env.COMPOSE_PROJECT_NAME = sh(
                        returnStdout: true,
                        script: '''
                            set -eu
                            docker inspect student-task-postgres \
                              --format '{{ index .Config.Labels "com.docker.compose.project" }}'
                        '''
                    ).trim()

                    if (!env.COMPOSE_PROJECT_NAME ||
                        env.COMPOSE_PROJECT_NAME == '<no value>') {
                        error('Existing PostgreSQL Compose project not found.')
                    }
                }

                sh '''
                    set -eu

                    test -r "$DEPLOY_ENV"

                    ln -sfn "$DEPLOY_ENV" backend/.env

                    docker compose \
                      --env-file "$DEPLOY_ENV" config --quiet
                '''
            }
        }

        stage('Backend Tests') {
            steps {
                sh '''
                    set -eu

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
                    set -eu

                    docker build -t "$FRONTEND_IMAGE" ./frontend
                    docker build -t "$BACKEND_IMAGE" ./backend
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
                        set -eu
                        set +x

                        echo "$GHCR_TOKEN" | docker login ghcr.io \
                          -u "$GHCR_USER" --password-stdin

                        docker push "$FRONTEND_IMAGE"
                        docker push "$BACKEND_IMAGE"
                    '''
                }
            }
        }

        stage('Deploy Application') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'ghcr-creds',
                        usernameVariable: 'GHCR_USER',
                        passwordVariable: 'GHCR_TOKEN'
                    )
                ]) {
                    sh '''
                        set -eu
                        set +x

                        echo "$GHCR_TOKEN" | docker login ghcr.io \
                          -u "$GHCR_USER" --password-stdin

                        docker compose \
                          --env-file "$DEPLOY_ENV" \
                          pull frontend backend

                        docker compose \
                          --env-file "$DEPLOY_ENV" \
                          up -d --no-build --wait --wait-timeout 120 \
                          postgres backend frontend

                        docker logout ghcr.io
                    '''
                }
            }
        }

        stage('Application Health Check') {
            steps {
                sh '''
                    set -eu

                    for attempt in $(seq 1 30); do

                        if curl -fsS --max-time 5 \
                          http://localhost:3000/ > /dev/null; then

                            status=$(curl -s --max-time 5 \
                              -o /dev/null -w '%{http_code}' \
                              http://localhost:3000/api/tasks || true)

                            if [ "$status" = "401" ]; then
                                echo "Application checks passed."
                                exit 0
                            fi
                        fi

                        sleep 2
                    done

                    echo "Application health check failed."
                    exit 1
                '''
            }
        }
    }

    post {
        success {
            echo 'Student Task Manager deployed successfully!'
        }

        failure {
            echo 'Pipeline failed. Check Jenkins Console Output.'
        }
    }
}
