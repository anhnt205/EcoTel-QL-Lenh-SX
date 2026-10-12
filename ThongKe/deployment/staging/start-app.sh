#!/bin/bash
# Start the application in the staging environment
docker compose -f staging-docker-compose.yml down
docker compose -f staging-docker-compose.yml pull
docker compose -f staging-docker-compose.yml up -d --wait --wait-timeout 120
docker image prune -f
docker images