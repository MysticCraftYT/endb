FROM node:lts-alpine
WORKDIR /repo
CMD npm ci && \
    npm test && \
    npm run coverage:html
