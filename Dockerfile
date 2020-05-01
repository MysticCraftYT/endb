FROM node:lts-alpine
WORKDIR /repo
CMD npm install && \
    npm test && \
    npm run coverage:html
