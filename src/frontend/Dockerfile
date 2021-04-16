# pull official base image
FROM node:14.16.0-alpine

ARG REACT_APP_API_BASE_URL
ARG REACT_APP_CMS_BASE_URL
ARG REACT_APP_FRONTEND_BASE_URL
ARG PUBLIC_URL
ARG REACT_APP_KEYCLOAK_AUTH_URL
ARG REACT_APP_KEYCLOAK_REALM
ARG REACT_APP_KEYCLOAK_CLIENT_ID

ENV REACT_APP_API_BASE_URL=${REACT_APP_API_BASE_URL}
ENV REACT_APP_CMS_BASE_URL=${REACT_APP_CMS_BASE_URL}
ENV REACT_APP_FRONTEND_BASE_URL=${REACT_APP_FRONTEND_BASE_URL}
ENV PUBLIC_URL=${PUBLIC_URL}
ENV REACT_APP_KEYCLOAK_AUTH_URL=${REACT_APP_KEYCLOAK_AUTH_URL}
ENV REACT_APP_KEYCLOAK_REALM=${REACT_APP_KEYCLOAK_REALM}
ENV REACT_APP_KEYCLOAK_CLIENT_ID=${REACT_APP_KEYCLOAK_CLIENT_ID}

# set working directory
WORKDIR /frontend

# add `/node_modules/.bin` to $PATH
ENV PATH ./node_modules/.bin:$PATH

RUN apk add --update \
    python \
    python-dev \
    py-pip \
    build-base \
    git \
    openssh-client \
    && pip install virtualenv \
    && rm -rf /var/cache/apk/*

# install app dependencies
COPY package.json ./
RUN npm install --silent
RUN npm install react-scripts@3.4.1 -g

# add bash to the image
RUN apk add --no-cache bash

# add app
COPY . ./

# start app
CMD ["npm", "start"]
