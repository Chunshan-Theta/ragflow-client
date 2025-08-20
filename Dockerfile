# 使用 Node 建置 React 專案
FROM node AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# Inject build-time env vars for CRA
ARG REACT_APP_DEFAULT_API_URL
ARG REACT_APP_DEFAULT_AGENT_ID
ARG REACT_APP_DEFAULT_API_KEY
ARG REACT_APP_DEFAULT_Home_page
ENV REACT_APP_DEFAULT_API_URL=$REACT_APP_DEFAULT_API_URL
ENV REACT_APP_DEFAULT_AGENT_ID=$REACT_APP_DEFAULT_AGENT_ID
ENV REACT_APP_DEFAULT_API_KEY=$REACT_APP_DEFAULT_API_KEY
ENV REACT_APP_DEFAULT_Home_page=$REACT_APP_DEFAULT_Home_page

RUN npm run build

# 使用 Nginx 服務靜態網站
FROM nginx
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
