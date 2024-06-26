# Containerized deployment

A containerized deployment of Trento Server is identical to a systemd deployment, except for the web and check engine components, which are deployed as containers running on a Docker engine instead of RPM's.

Follow the steps in [4.2 systemd deployment](https://documentation.suse.com/sles-sap/trento/html/SLES-SAP-trento/index.html#sec-systemd-deployment), but replace the step **Install Trento using RPM packages** with **Install Trento using Docker** section.

## Install Trento using Docker

### Install Docker container runtime

1. Enable the container`s module:

   ```bash
   SUSEConnect --product sle-module-containers/15.5/x86_64
   ```

   > **Note:** Using a different Service Pack than SP5 requires to change repository: [SLE15 SP3: `SUSEConnect --product sle-module-containers/15.3/x86_64`,SLE15 SP4: ` SUSEConnect --product sle-module-containers/15.4/x86_64`]

1. Install Docker:

   ```bash
   zypper install docker
   ```

1. Enable and start Docker:

   ```bash
   systemctl enable --now docker
   ```

### Create a dedicated Docker network for Trento

1. Create the Trento Docker network:

   ```bash
   docker network create trento-net
   ```

   > **Note:** When creating the trento-net network, Docker typically assigns a default subnet: `172.17.0.0/16`. Ensure that this subnet matches the one specified in your PostgreSQL configuration file (refer to`/var/lib/pgsql/data/pg_hba.conf`). If the subnet of `trento-net` differs from `172.17.0.0/16` then adjust `pg_hba.conf` and restart PostgreSQL.

1. Verify the subnet of trento-net:

   ```bash
   docker network inspect trento-net  --format '{{range .IPAM.Config}}{{.Subnet}}{{end}}'
   ```

   Expected output:

   ```bash
   172.17.0.0/16
   ```

### Install Trento on Docker

1. Create the secret environment variables:

   > Note: Consider using an environment variable file, learn more about from [official Docker documentation](https://docs.docker.com/engine/reference/commandline/run/#env). Adjust upcoming commands for env file usage.

   ```bash
   WANDA_SECRET_KEY_BASE=$(openssl rand -out /dev/stdout 48 | base64)
   TRENTO_SECRET_KEY_BASE=$(openssl rand -out /dev/stdout 48 | base64)
   ACCESS_TOKEN_ENC_SECRET=$(openssl rand -out /dev/stdout 48 | base64)
   REFRESH_TOKEN_ENC_SECRET=$(openssl rand -out /dev/stdout 48 | base64)
   ```

1. Install trento-wanda on Docker:

   ```bash
   docker run -d --name wanda \
       -p 4001:4000 \
       --network trento-net \
       --add-host "host.docker.internal:host-gateway" \
       -e CORS_ORIGIN=localhost \
       -e SECRET_KEY_BASE=$WANDA_SECRET_KEY_BASE \
       -e ACCESS_TOKEN_ENC_SECRET=$ACCESS_TOKEN_ENC_SECRET \
       -e AMQP_URL=amqp://trento_user:trento_user_password@host.docker.internal/vhost \
       -e DATABASE_URL=ecto://wanda_user:wanda_password@host.docker.internal/wanda \
       --restart always \
       --entrypoint /bin/sh \
       registry.suse.com/trento/trento-wanda:1.2.0 \
       -c "/app/bin/wanda eval 'Wanda.Release.init()' && /app/bin/wanda start"
   ```

1. Install trento-web on Docker

   Be sure to change the `ADMIN_USERNAME` and `ADMIN_PASSWORD`, these are the credentials that will be required to login to the trento-web UI.
   Depending on how you intend to connect to the console, a working hostname, FQDN, or an IP is required in `TRENTO_WEB_ORIGIN` for HTTPS otherwise, websockets will fail to connect, causing no real-time updates on the UI.

   > **Note:** Add `CHARTS_ENABLED=false` if Prometheus is not installed or you don't want to use the charts feature of Trento.

   ```bash
   docker run -d \
   -p 4000:4000 \
   --name trento-web \
   --network trento-net \
   --add-host "host.docker.internal:host-gateway" \
   -e AMQP_URL=amqp://trento_user:trento_user_password@host.docker.internal/vhost \
   -e ENABLE_ALERTING=false \
   -e DATABASE_URL=ecto://trento_user:web_password@host.docker.internal/trento \
   -e EVENTSTORE_URL=ecto://trento_user:web_password@host.docker.internal/trento_event_store \
   -e PROMETHEUS_URL='http://host.docker.internal:9090' \
   -e SECRET_KEY_BASE=$TRENTO_SECRET_KEY_BASE \
   -e ACCESS_TOKEN_ENC_SECRET=$ACCESS_TOKEN_ENC_SECRET \
   -e REFRESH_TOKEN_ENC_SECRET=$REFRESH_TOKEN_ENC_SECRET \
   -e ADMIN_USERNAME='admin' \
   -e ADMIN_PASSWORD='test1234' \
   -e ENABLE_API_KEY='true' \
   -e TRENTO_WEB_ORIGIN='trento.example.com' \
   --restart always \
   --entrypoint /bin/sh \
   registry.suse.com/trento/trento-web:2.2.0 \
   -c "/app/bin/trento eval 'Trento.Release.init()' && /app/bin/trento start"
   ```

   Mail alerting is disabled by default, as described in [enabling alerting](https://github.com/trento-project/web/blob/main/guides/alerting/alerting.md#enabling-alerting) guide. Enable alerting by setting `ENABLE_ALERTING` env to `true`. Additional required variables are: `[ALERT_SENDER,ALERT_RECIPIENT,SMTP_SERVER,SMTP_PORT,SMTP_USER,SMTP_PASSWORD]`
   All other settings should remain as they are.

   Example:

   ```bash
   docker run -d \

   ...[other settings]...

   -e ENABLE_ALERTING=true \
   -e ALERT_SENDER=<<SENDER_EMAIL_ADDRESS>> \
   -e ALERT_RECIPIENT=<<RECIPIENT_EMAIL_ADDRESS>> \
   -e SMTP_SERVER=<<SMTP_SERVER_ADDRESS>> \
   -e SMTP_PORT=<<SMTP_PORT>> \
   -e SMTP_USER=<<SMTP_USER>> \
   -e SMTP_PASSWORD=<<SMTP_PASSWORD>> \

   ...[other settings]...
   ```

1. Check that everything is running as expected:

   ```bash
   docker ps
   ```

   Expected output:

   ```bash
   CONTAINER ID   IMAGE                                         COMMAND                  CREATED          STATUS          PORTS                                       NAMES
   8b44333aec39   registry.suse.com/trento/trento-web:2.2.0    "/bin/sh -c '/app/bi…"   6 seconds ago    Up 5 seconds    0.0.0.0:4000->4000/tcp, :::4000->4000/tcp   trento-web
   e859c07888ca   registry.suse.com/trento/trento-wanda:1.2.0   "/bin/sh -c '/app/bi…"   18 seconds ago   Up 16 seconds   0.0.0.0:4001->4000/tcp, :::4001->4000/tcp   wanda
   ```

   Both containers should be running and listening on the specified ports.
