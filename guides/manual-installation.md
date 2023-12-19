## Scope

This documents covers the step to manually install trento server without relying on the trento helm chart or kubernetes all together. The lastest
available version of SUSE Linux Enterprise Server for SAP Applications is used as the base operating system, which is 15 SP5 at the time of writing.

## List of dependencies

- prometheus (optional)
- postgresql
- grafana (optional)
- rabbitmq
- docker runtime

## Installation

### Install prometheus (Optional)

#### Option 1: Use existing installation

If you already have a prometheus server running, you can skip this step. , you can skip the inst

#### Option 2: Do not use prometheus

If you don't have a Prometheus instance running and you don't want to install one, you can continue without doing so. The downside is that trento will
not be able to collect metrics from prometheus and the integrated graphs will not work.

#### Option 3: Install prometheus using the unsupported PackageHub repository

Enable PackageHub repository:

```bash
SUSEConnect --product PackageHub/15.5/x86_64
```

Add the prometheus user/group:

```bash
groupadd --system prometheus
useradd -s /sbin/nologin --system -g prometheus prometheus
```

After a successful registration, you can install prometheus using zypper:
NOTE: some of these steps will trigger messages aboute additional support contract being required.

```bash
zypper in golang-github-prometheus-prometheus
```

We will be prompted that a missing dependency can't be satisfied:

```bash
Problem: nothing provides 'group(prometheus)' needed by the to be installed golang-github-prometheus-prometheus-2.37.6-150100.4.17.1.x86_64
 Solution 1: do not install golang-github-prometheus-prometheus-2.37.6-150100.4.17.1.x86_64
 Solution 2: break golang-github-prometheus-prometheus-2.37.6-150100.4.17.1.x86_64 by ignoring some of its dependencies
```

As we have added the prometheus user/group, we can safely ignore this warning and proceed with the installation (option 2).

Enable and start the prometheus service:

```bash
systemctl enable --now prometheus
```

Allow prometheus to be accessible from docker. Add an exception on firewalld:

```bash
firewall-cmd --zone=public --add-port=9090/tcp --permanent;
firewall-cmd --reload
```

### Install grafana (Optional)

Enable PackageHub if you didn't enable it in the previous step:

```bash
SUSEConnect --product PackageHub/15.5/x86_64
```

Install grafana:

```bash
zypper install grafana
```

Enable and start the service:

```bash
systemctl enable --now grafana-server
```

Allow grafana to be accessible from docker. Add an exception on firewalld:

```bash
firewall-cmd --zone=public --add-port=3000/tcp --permanent;
firewall-cmd --reload
```

Check grafana web UI on port 3000 and set a new password for the user `admin` (we set it to `trento` for this example)

### Install postgresql

```bash
zypper in postgresql-server
```

Enable and start the postgresql service:

```bash
systemctl enable --now postgresql
```

Initialize the postgresql databases (be sure to update the passwords accordingly):

//FIXME: we should probably use `createuser`: https://www.postgresql.org/docs/current/app-createuser.html

```bash
su postgres
psql
CREATE DATABASE wanda;
CREATE USER wanda_user WITH PASSWORD 'wanda-password';
GRANT ALL PRIVILEGES ON DATABASE wanda TO wanda_user;
CREATE DATABASE trento;
CREATE USER trento_user WITH PASSWORD 'web-password';
GRANT ALL PRIVILEGES ON DATABASE trento TO trento_user;
CREATE DATABASE trento_event_store;
GRANT ALL PRIVILEGES ON DATABASE trento_event_store TO trento_user;

ALTER DATABASE wanda OWNER TO wanda_user;
ALTER DATABASE trento OWNER TO trento_user;
ALTER DATABASE trento_event_store OWNER TO trento_user;
\l
\q
```

Allow wandadb to be accessible by the docker containers,
by adding the following line to `/var/lib/pgsql/data/pg_hba.conf`:

```bash
host    all             all             0.0.0.0/0            md5
```

Add this line to `/var/lib/pgsql/data/postgresql.conf` to access postgres database

```bash
listen_addresses = 'localhost, 172.17.0.1, 127.0.0.1'
```

listen_addresses = 'localhost,172.17.0.1,127.0.0.1'

Restart postgres to apply the changes:

```bash
systemctl reload postgresql
```

### Install rabbitmq

```bash
zypper install rabbitmq-server
```

Enable and start the rabbitmq service.

```bash
systemctl enable --now rabbitmq-server
```

As the agent will need to be able to reach rabbitmq, allow connections from external hosts.
Modify `/etc/rabbitmq/rabbitmq.conf` and ensure the following lines are present:

```bash
listeners.tcp.default = 5672
```

In addition to this, we need to allow the port to be accessible from external hosts. Add an exception on firewalld:

```bash
firewall-cmd --zone=public --add-port=5432/tcp --permanent;
firewall-cmd --reload
```

```bash
systemctl restart rabbitmq-server
```

### Configure rabbitmq

#### Create rabbitmq user

RabbitMQ will create per default a guest admin user.A good practice is to create a new user with correct permissions.
Change rabbitmq_user, rabbitmq_user_password and vhost name in the upcoming commands:

```bash
rabbitmqctl add_user trento_user trento_user_password
```

#### Set role for new user

```bash
rabbitmqctl set_user_tags trento_user administrator
```

#### Verify that the user and the user role is correct

```bash
rabbitmqctl list_users
```

#### Create a virtual host

```bash
rabbitmqctl add_vhost vhost
```

# Set permissions for the user on the virtual host

```bash
rabbitmqctl set_permissions -p vhost trento_user ".*" ".*" ".*"
```

#### Optional: Enable rabbitmq management console

To be able to access the rabbitmq management console, the relevant plugin needs to be enabled:

```bash
rabbitmq-plugins enable rabbitmq_management
```

#### Set permissions for user to acess the managment ui

```bash
rabbitmqctl set_user_tags trento_user management administrator management
```

#### Verify the User's New Role

```bash
rabbitmqctl rabbitmqctl list_users
```

If you are connecting from an external host, add an exception on firewalld:
Modify `/etc/rabbitmq/rabbitmq.conf` add the follow line:

```bash


management.tcp.port = 15672
management.tcp.ip = 0.0.0.0


```

```bash
firewall-cmd --zone=public --add-port=15672/tcp --permanent;
firewall-cmd --reload
```

```bash
systemctl restart rabbitmq-server
```

#### Access the rabbitmqctl management and login with your newly created user

```bash
http://««HOST-IP»»:15672
```

### Install container runtime

First we need to enable the containers module:

```bash
SUSEConnect --product sle-module-containers/15.5/x86_64
```

Then we can install docker:

```bash
zypper install docker
```

Enable and start Docker:

```bash
systemctl enable --now docker
```

### Deploy trento-wanda and trento-web components on docker:

#### Create the secrets

```bash
WANDA_SECRET_KEY_BASE=$(openssl rand -out /dev/stdout 48 | base64)
TRENTO_SECRET_KEY_BASE=$(openssl rand -out /dev/stdout 48 | base64)
ACCESS_TOKEN_ENC_SECRET=$(openssl rand -out /dev/stdout 48 | base64)
REFRESH_TOKEN_ENC_SECRET=$(openssl rand -out /dev/stdout 48 | base64)

```

#### Create a dedicated docker network for trento

```bash
docker network create trento-net
```

#### Install trento-wanda on docker:

```bash
docker run -d --name wanda \
    -p 4001:4000 \
    --network trento-net \
    --add-host "host.docker.internal:host-gateway" \
    -e CORS_ORIGIN=localhost \
    -e SECRET_KEY_BASE=$WANDA_SECRET_KEY_BASE \
    -e ACCESS_TOKEN_ENC_SECRET=$ACCESS_TOKEN_ENC_SECRET \
    -e AMQP_URL=amqp://trento_user:trento_user_password@host.docker.internal \
    -e DATABASE_URL=ecto://wanda_user:wanda-password@host.docker.internal/wanda \
    --entrypoint /bin/sh \
    registry.suse.com/trento/trento-wanda:1.2.0 \
    -c "/app/bin/wanda eval 'Wanda.Release.init()' && /app/bin/wanda start"
```

#### Install trento-web on docker:

> Note: Be sure to change the `ADMIN_USERNAME` and `ADMIN_PASSWORD` environment variables to your desired values.

> Note: Be sure to change the `GRAFANA_PASSWORD` (and potentially `GRAFANA_USER` if you changed it) environment variable to the password you set for the grafana admin user in the grafana installation step.

```bash
docker run -d \
 -p 4000:4000 \
 --name trento-web \
 --network trento-net \
 --add-host "host.docker.internal:host-gateway" \
 -e AMQP_URL=amqp://trento_user:trento_user_password@host.docker.internal \
 -e DATABASE_URL=ecto://trento_user:web-password@host.docker.internal/trento \
 -e EVENTSTORE_URL=ecto://trento_user:web-password@host.docker.internal/trento_event_store \
 -e ENABLE_ALERTING=false \
 -e GRAFANA_PUBLIC_URL='http://host.docker.internal:3000' \
 -e GRAFANA_API_URL='http://host.docker.internal:3000/api' \
 -e PROMETHEUS_URL='http://host.docker.internal' \
 -e SECRET_KEY_BASE=$TRENTO_SECRET_KEY_BASE \
 -e ACCESS_TOKEN_ENC_SECRET=$ACCESS_TOKEN_ENC_SECRET \
 -e REFRESH_TOKEN_ENC_SECRET=$REFRESH_TOKEN_ENC_SECRET \
 -e ADMIN_USERNAME='admin' \
 -e ADMIN_PASSWORD='test1234' \
 -e GRAFANA_PASSWORD='trento' \
 -e ENABLE_API_KEY='true' \
 --entrypoint /bin/sh \
 registry.suse.com/trento/trento-web:2.2.0 \
 -c "/app/bin/trento eval 'Trento.Release.init()' && /app/bin/trento start"

```

### Setup nginx as reverse proxy

#### Option 1: Creating a Self-Signed Certificate

> Note: This is a basic guide for creating a self-signed certificate for use with Trento. You may use your own certificate. For detailed instructions, consult the OpenSSL documentation. Remember to replace example.com with your domain.

**Step 1**: Generate a private key:

```bash
openssl genrsa -des3 -out trento.key 2048
```

**Step 2**: Generate a CSR (Certificate Signing Request):

```bash
openssl req -new -key trento.key -out trento.csr
```

Follow the prompts to enter your information.

**Step 3**: Remove passphrase from the key

```bash
cp trento.key trento.key.org
openssl rsa -in trento.key.org -out trento.key
```

**Step 4**: Create config file for SAN:

> Note: See [X509 V3 certificate extension configuration format documentation](https://www.openssl.org/docs/man1.0.2/man5/x509v3_config.html) for more details.

```bash
echo 'subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid:always,issuer:always
basicConstraints = CA:TRUE
keyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment, keyAgreement, keyCertSign
subjectAltName = DNS:example.com, DNS:*.example.com
issuerAltName = issuer:copy' > v3.ext
```

**Step 5**: Generate and sign the certificate:

```shell
openssl x509 -req -in trento.csr -signkey trento.key -out trento.crt -days 3650 -sha256 -extfile v3.ext
```

**Step 6**: Install the `trento.key` and `trento.crt` in a location accessible by `nginx`:

```bash
mv trento.key /etc/ssl/private/trento.key
```

```bash
mv trento.crt /etc/ssl/certs/trento.crt
```

#### Option 2: Using Let's Encrypt for a Signed Certificate

**Step 1**: Add PackageHub if not already added:

```bash
SUSEConnect --product PackageHub/15.5/x86_64
zypper refresh
```

**Step 2**: Install Certbot and its Nginx plugin:

```bash
zypper install certbot python3-certbot-nginx
```

**Step 3**: Obtain a certificate and configure Nginx with Certbot:

> Note: Replace `example.com` with your domain. For more information, visit [Certbot instructions for Nginx](https://certbot.eff.org/instructions?ws=nginx&os=leap)

```bash
certbot --nginx -d example.com -d www.example.com
```

> Note: Certbot certificates last for 90 days. Refer to the above link for details on how to renew periodically.

#### Install and configure nginx

**Step 1**: Install nginx package:

```bash
zypper install nginx
```

**Step 2**: Add firewall exceptions for HTTP and HTTPS:

```bash
firewall-cmd --zone=public --add-service=https --permanent
firewall-cmd --zone=public --add-service=http --permanent
firewall-cmd --reload
```

**Step 3**:Start and enable nginx:

```bash
systemctl enable --now nginx
```

**Step 4**: Create a configuration file for trento

```bash
vim /etc/nginx/conf.d/trento.conf
```

Add the following configuration

```bash
server {
    # Redirect HTTP to HTTPS
    listen 80;
    server_name trento.example.com;
    return 301 https://$host$request_uri;
}

server {
    # SSL configuration
    listen 443 ssl;
    server_name trento.example.com;

    ssl_certificate /etc/ssl/certs/trento.crt;
    ssl_certificate_key /etc/ssl/private/trento.key;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;

    # Wanda rule
    location ~ ^/(api/checks|api/v1/checks|api/v2/checks)/  {
        allow all;

        # Proxy Headers
        proxy_http_version 1.1;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Host $http_host;
        proxy_set_header X-Cluster-Client-Ip $remote_addr;

        # The Important Websocket Bits!
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_pass http://localhost:4001;
    }

    # Web rule
    location / {
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;

        # The Important Websocket Bits!
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_pass http://localhost:4000;
    }
}
```

**Step 5**: Reload Nginx to apply changes:

```bash
systemctl reload nginx
```

### Testing the setup

Deploy an agent using the available `trento-agent` package. This package is already available in SLES 15 SP5, so we can install it using zypper:

```bash
zypper install trento-agent
```

#### Configuring the Agent host with the Self-Signed Certificate

**Step 1**: Copy the `trento.crt` to the agent machine. Use `scp` to transfer the certificate to `/etc/pki/trust/anchors/`.

**Step 2**: Update the certificate store:

```bash
update-ca-certificates
```

Configure trento using the `/etc/trento/agent.yaml` file and make sure to use `https` for the `server-url` parameter. Refer to https://documentation.suse.com/sles-sap/trento/html/SLES-SAP-trento/index.html#sec-trento-installing-trentoagent for more details.
