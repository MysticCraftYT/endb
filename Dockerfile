FROM node:lts-alpine
WORKDIR /repo
CMD npm install && \
    npm test