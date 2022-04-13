#################################################
#### Adding Lacework Agent

# Borrowing the latest-sidecar image to extract the datacollector binaries
FROM lacework/datacollector:latest-sidecar AS lacework
RUN cp /var/lib/lacework-backup/*/datacollector-musl /datacollector_alpine

# Build a fresh alpine image
FROM alpine:latest

# Add SSL certs
RUN apk -U --no-cache add ca-certificates
RUN rm -rf /var/cache/apk/*

# Prep and copy lacework agent
RUN mkdir -p /var/log/lacework /var/lib/lacework/config
COPY --from=lacework /datacollector_alpine /var/lib/lacework/datacollector
RUN chmod +x /var/lib/lacework/datacollector

# Copy entrypoint script
COPY lacework-entrypoint.sh /lacework-entrypoint.sh
RUN chmod +x /lacework-entrypoint.sh

# ENTRYPOINT will carry over to downstream containers (unless they specify their own ENTRYPOINT)
ENTRYPOINT ["/lacework-entrypoint.sh"]


#################################################
#### Adding nodejs-reverse-shell specific content

RUN apk -U --no-cache add nodejs npm bash nmap curl

RUN rm -rf /etc/nginx/*
RUN rm -rf /usr/share/nginx
EXPOSE 8080
COPY app /app

WORKDIR "/app"

RUN npm install
CMD ["node", "server.js"]
