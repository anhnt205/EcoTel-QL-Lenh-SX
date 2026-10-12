### Build Front-End
### E.g.: $ docker build -t ecotel_frontend_img:latest .
# $ docker run -d -p 3000:80 ecotel_frontend_img:latest

## Create an image based on the official Node image from dockerhub
FROM node:18 AS development

## Create app directory
WORKDIR /usr/src/app

## A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./
## Clean & install app dependencies
## --legacy-peer-deps: vite@5 đòi @types/node >= 18 (peerOptional) trong khi package.json ghim ^16 -> `npm i` thường báo ERESOLVE.
RUN npm i --legacy-peer-deps

## Bundle app source
## Get all the code needed to run the app
COPY . .

## Vite bake VITE_* vào bundle lúc build. CI vẫn ghi Frontend/.env như cũ; bản gộp (docker-compose.unified.yaml) truyền qua build-arg.
## `env` chỉ đặt biến nào CÓ giá trị — ARG rỗng không được đè lên file .env.
ARG VITE_BASE_API
ARG VITE_SOCKET_API
ARG VITE_MAP_API_KEY
RUN env ${VITE_BASE_API:+VITE_BASE_API="$VITE_BASE_API"} \
        ${VITE_SOCKET_API:+VITE_SOCKET_API="$VITE_SOCKET_API"} \
        ${VITE_MAP_API_KEY:+VITE_MAP_API_KEY="$VITE_MAP_API_KEY"} \
    npm run build

## Create an HTTP web server based on nginx image;
## default nginx server's port is 80
### E.g.: $ docker run -d -p 3000:80 frontend:latest
FROM nginx:alpine

### Reference for connecting Frontend to Backend
# 1. https://github.com/kubernetes/website/blob/main/content/en/examples/service/access/Dockerfile
# 2. https://kubernetes.io/docs/tasks/access-application-cluster/connecting-frontend-backend/

COPY .nginx/nginx.conf /etc/nginx/conf.d/default.conf
WORKDIR /usr/share/nginx/html
# Remove default nginx static assets
RUN rm -rf ./*
# Copy static assets from builder stage
COPY --from=development /usr/src/app/build /usr/share/nginx/html
# Containers run nginx with global directives and daemon off
ENTRYPOINT ["nginx", "-g", "daemon off;"]
