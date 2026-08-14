FROM	node:20-bullseye-slim AS builder

RUN	npm install -g n8n@1.72.1 --omit=dev --no-audit --no-fund \
	&& npm cache clean --force

FROM	node:20-bullseye-slim

COPY	--from=builder /usr/local/lib/node_modules/n8n /usr/local/lib/node_modules/n8n
RUN	ln -s ../lib/node_modules/n8n/bin/n8n /usr/local/bin/n8n

RUN	mkdir -p /home/node/.n8n \
	&& chown -R node:node /home/node

USER	node
WORKDIR	/home/node

EXPOSE	5678

CMD	["n8n", "start"]
