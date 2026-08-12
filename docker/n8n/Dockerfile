FROM	debian:bullseye

RUN	apt-get update && apt-get install -y \
	curl \
	ca-certificates \
	gnupg \
	&& rm -rf /var/lib/apt/lists/*


RUN	curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
	&& apt-get install -y nodejs \
	&& rm -rf /var/lib/apt/lists/*

RUN	npm install -g n8n@1.72.1

RUN	useradd -m -u 1000 -s /bin/bash node \
	&& mkdir -p /home/node/.n8n \ 
	&& chown -R node:node /home/node

USER	node
WORKDIR	/home/node

EXPOSE	5678

CMD	["n8n", "start"]


