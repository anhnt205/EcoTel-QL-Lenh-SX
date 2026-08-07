#!/bin/bash
# Start the application in the staging environment
# Docker compose for deployment
docker compose -f staging-docker-compose.yml down # always down first
docker compose -f staging-docker-compose.yml pull # always pull the latest images
# run containers in detached mode
nohup docker compose -f staging-docker-compose.yml up  -d > deploy.log 2>&1 & 
# Check built images
docker image prune -f # clean up unused images
docker images