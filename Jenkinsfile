pipeline {
    // Run this job on the Ubuntu lab PC with Docker Engine installed.
    agent any

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
        DEPLOY_ENV = '/opt/student-task-manager/deploy.env'
    }

    stages {
        stage('Checkout code') {
            steps {
                checkout scm
            }
        }

        stage('Check configuration') {
            steps {
                script {
                    // Preserve the existing Compose project and database volume.
                    env.COMPOSE_PROJECT_NAME = sh(
                        returnStdout: true,
                        script: '''
                            set -eu
                            docker inspect student-task-postgres \
                              --format '{{ index .Config.Labels "com.docker.compose.project" }}'
                        '''
                    ).trim()

                    if (!env.COMPOSE_PROJECT_NAME || env.COMPOSE_PROJECT_NAME == '<no value>') {
                        error('The existing database must belong to a Docker Compose project before deployment.')
                    }
                }

                sh '''
                    set -eu
                    docker compose version
                    test -r "$DEPLOY_ENV"
                    ln -sfn "$DEPLOY_ENV" backend/.env
                    docker compose --env-file "$DEPLOY_ENV" config --quiet
                '''
            }
        }

        stage('Build Docker images') {
            steps {
                sh '''
                    set -eu
                    docker compose --env-file "$DEPLOY_ENV" build backend frontend
                '''
            }
        }

        stage('Run backend tests') {
            steps {
                sh '''
                    set -eu
                    docker compose --env-file "$DEPLOY_ENV" \
                      run --rm --no-deps -T backend npm test
                '''
            }
        }

        stage('Deploy application') {
            steps {
                sh '''
                    set -eu
                    docker compose --env-file "$DEPLOY_ENV" \
                      up -d --no-build --wait --wait-timeout 120 \
                      postgres backend frontend
                '''
            }
        }

        stage('Check application') {
            steps {
                sh '''
                    set -eu
                    for attempt in $(seq 1 30); do
                        if curl -fsS --max-time 5 http://localhost:3000/ > /dev/null; then
                            status=$(curl -s --max-time 5 -o /dev/null -w '%{http_code}' \
                              http://localhost:3000/api/tasks || true)

                            # Anonymous requests to this protected route must return 401.
                            if [ "$status" = "401" ]; then
                                echo "Application checks passed."
                                exit 0
                            fi
                        fi
                        sleep 2
                    done
                    echo "Application check failed."
                    exit 1
                '''
            }
        }
    }

    post {
        success {
            echo 'Build, tests, and deployment succeeded.'
        }
        failure {
            echo 'Pipeline failed. Open Console Output to inspect the error. No automatic rollback is configured.'
        }
    }
}
