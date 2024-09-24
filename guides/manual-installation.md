# Installation of Trento

## Scope

This document covers the steps to manually install Trento server. The latest available version of SUSE Linux Enterprise Server for SAP Applications is used as the base operating system, which is [SLE 15 SP5](https://www.suse.com/download/sles/) at the time of writing.
For installations on Service Packs other than SP5, ensure to update the repository address as indicated in the respective notes provided throughout this guide.

**Supported Service Packs**:

- SP3
- SP4
- SP5

## List of dependencies

- [PostgreSQL](https://www.postgresql.org/)
- [RabbitMQ](https://rabbitmq.com/)
- [NGINX](https://nginx.org/en/)
- [Docker](https://www.docker.com/) (optional)
- [Prometheus](https://prometheus.io/) (optional)

## Install Trento dependencies

### Install Prometheus (Optional)

[Prometheus](https://prometheus.io/) is not required to run Trento, but it is recommended as it allows Trento to display a series of charts for each host with useful information about the CPU load, memory, and other important metrics.

> **Note:** If you choose not to install Prometheus or to provide an existing installation, ensure that `CHARTS_ENABLED` is set to false in the Trento web RPM configuration file, which is stored at `/etc/trento/trento-web`, or when it is provided to the Trento web container. Refer to [Install Trento server components](#install-trento-server-components).

#### <a id="prometheus_install_option_1"></a>Option 1: Use existing installation

Minimal required Prometheus version is **2.28.0**.

If you have an [existing Prometheus server](https://prometheus.io/docs/prometheus/latest/installation/), ensure to set the PROMETHEUS_URL environment variable with your Prometheus server's URL as part of the Docker command when creating the `trento-web` container or configuring the RPM packages. Use [Trento's Prometheus configuration](#prometheus_trento_configuration) as a reference to adjust the Prometheus configuration.

#### Option 2: Install Prometheus using the **unsupported** PackageHub repository

[PackageHub](https://packagehub.suse.com/) packages are tested by SUSE, but they do not come with the same level of support as the core SLES packages. Users should assess the suitability of these packages based on their own risk tolerance and support needs.

1.  Enable PackageHub repository:

    ```bash
    SUSEConnect --product PackageHub/15.5/x86_64
    ```

    > **Note:** SLE15 SP3 requires a provided Prometheus server. The version available through `SUSEConnect --product PackageHub/15.3/x86_64` is outdated and is not compatible with Trento's Prometheus configuration.
    > Refer to [Option 1: Use existing installation option](#prometheus_install_option_1) for SLE 15 SP3.

    > **Note:** For SLE15 SP4 change the repository to `SUSEConnect --product PackageHub/15.4/x86_64`

1.  Add the Prometheus user/group:

    ```bash
    groupadd --system prometheus
    useradd -s /sbin/nologin --system -g prometheus prometheus
    ```

1.  Install Prometheus using zypper:
    ```bash
    zypper in golang-github-prometheus-prometheus
    ```
    > **Note:** In case the missing dependency can't be satisfied we have already added the Prometheus user/group. With this, it is safe to proceed with the installation by choosing Solution 2: break golang-github-prometheus-prometheus

1.  <a id="prometheus_trento_configuration"></a>Change Prometheus configuration by replacing the configuration at `/etc/prometheus/prometheus.yml` with:
    ```yaml
    global:
      scrape_interval: 30s
      evaluation_interval: 10s

    scrape_configs:
      - job_name: "http_sd_hosts"
        honor_timestamps: true
        scrape_interval: 30s
        scrape_timeout: 30s
        scheme: http
        follow_redirects: true
        http_sd_configs:
          - follow_redirects: true
            refresh_interval: 1m
            url: http://localhost:4000/api/prometheus/targets
    ```

    > **Note:** **localhost:4000** in **url: http://localhost:4000/api/prometheus/targets** refers to the location where Trento web service is running.

1.  Enable and start the Prometheus service:

    ```bash
    systemctl enable --now prometheus
    ```

1.  If firewalld is running, allow Prometheus to be accessible from Docker and add an exception on firewalld:

    ```bash
    firewall-cmd --zone=public --add-port=9090/tcp --permanent
    firewall-cmd --reload
    ```

### Install PostgreSQL
This guide was tested with the following PostgreSQL version:

- **13.9 for SP3**
- **14.10 for SP4**
- **15.5 for SP5**
Using a different version of PostgreSQL may require different steps or configurations, especially when changing the major number. For more details, refer to the official [PostgreSQL documentation](https://www.postgresql.org/docs/).

1. Install PostgreSQL server:
    ```bash
    zypper in postgresql-server
    ```

1. Enable and start PostgreSQL server:

    ```bash
    systemctl enable --now postgresql
    ```

#### Configure PostgreSQL

1. Start `psql` with the `postgres` user to open a connection to the database:
    ```bash
    su - postgres
    psql
    ```
1. Initialize the databases in `psql` console:
      ```sql
      CREATE DATABASE wanda;
      CREATE DATABASE trento;
      CREATE DATABASE trento_event_store;
      ```
1. Create the users:
      ```sql
      CREATE USER wanda_user WITH PASSWORD 'wanda_password';
      CREATE USER trento_user WITH PASSWORD 'web_password';
      ```
1. Grant required privileges to the users and close the connection:
      ```sql
      \c wanda
      GRANT ALL ON SCHEMA public TO wanda_user;
      \c trento
      GRANT ALL ON SCHEMA public TO trento_user;
      \c trento_event_store;
      GRANT ALL ON SCHEMA public TO trento_user;
      \q
      ```
    You can exit from the `psql` console and `postgres` user.

1. Allow the PostgreSQL database to receive connections for the respective databases and users adding the following in `/var/lib/pgsql/data/pg_hba.conf`:

    ```bash
    host   wanda                      wanda_user    0.0.0.0/0   md5
    host   trento,trento_event_store  trento_user   0.0.0.0/0   md5
    ```

    > **Note:** The `pg_hba.conf` file works in a sequential fashion. This means, that the rules positioned on the top have preference over the ones coming next. This examples shows a pretty permissive address range, so in order to work, they entries must be written in the top of the `host` entries. Find additional information in the [pg_hba.conf](https://www.postgresql.org/docs/current/auth-pg-hba-conf.html) documentation.


1. Allow PostgreSQL to bind on all network
    interfaces in `/var/lib/pgsql/data/postgresql.conf` by changing the following line:

    ```bash
    listen_addresses = '*'
    ```

1. Restart PostgreSQL to apply the changes:

    ```bash
    systemctl restart postgresql
    ```

### Install RabbitMQ

1.  Install RabbitMQ server:
    ```bash
    zypper install rabbitmq-server
    ```

1.  Allow connections from external hosts by modifying `/etc/rabbitmq/rabbitmq.conf`, so the Trento-agent can reach RabbitMQ:
    ```ini
    listeners.tcp.default = 5672
    ```

1.  If firewalld is running, add an exception on firewalld:

        ```bash
        firewall-cmd --zone=public --add-port=5672/tcp --permanent;
        firewall-cmd --reload
        ```

1.  Enable RabbitMQ service:

    ```bash
    systemctl enable --now rabbitmq-server
    ```

#### Configure RabbitMQ

To configure RabbitMQ for a production system, follow the official suggestions [RabbitMQ guide](https://www.rabbitmq.com/production-checklist.html).

1.  Create a new RabbitMQ user:
    ```bash
    rabbitmqctl add_user trento_user trento_user_password
    ```

1.  Create a virtual host:
    ```bash
    rabbitmqctl add_vhost vhost
    ```

1.  Set permissions for the user on the virtual host:
    ```bash
    rabbitmqctl set_permissions -p vhost trento_user ".*" ".*" ".*"
    ```

## Install Trento server components

Trento server components are available in 2 different installation formats: RPM packages and Docker images.
Each of them has a different installation process, but the end result is the same. To choose between any of them depends on a usage preference between RPM packages and Docker images.

### Install Trento using RPM packages

The `trento-web` and `trento-wanda` packages come in the supported SLES4SAP distributions by default.

Install Trento web and wanda:
```bash
zypper install trento-web trento-wanda
```

#### Create the configuration files

Both services depend on respective configuration files that tune the usage of them. They must be placed in
`/etc/trento/trento-web` and `/etc/trento/trento-wanda` respectively, and examples of how to fill them are
available at `/etc/trento/trento-web.example` and `/etc/trento/trento-wanda.example`.

**Important: The content of `SECRET_KEY_BASE` and `ACCESS_TOKEN_ENC_SECRET` in both `trento-web` and `trento-wanda` must be the same.**

> **Note:** You can create the content of the secret variables like `SECRET_KEY_BASE`, `ACCESS_TOKEN_ENC_SECRET` and `REFRESH_TOKEN_ENC_SECRET` 
with `openssl` running `openssl rand -out /dev/stdout 48 | base64`

> Note: Depending on how you intend to connect to the console, a working hostname, FQDN, or an IP is required in `TRENTO_WEB_ORIGIN` for HTTPS; otherwise, websockets will fail to connect, causing no real-time updates on the UI.

#### trento-web configuration

```
# /etc/trento/trento-web
AMQP_URL=amqp://trento_user:trento_user_password@localhost:5672/vhost
DATABASE_URL=ecto://trento_user:web_password@localhost/trento
EVENTSTORE_URL=ecto://trento_user:web_password@localhost/trento_event_store
ENABLE_ALERTING=false
CHARTS_ENABLED=true
PROMETHEUS_URL=http://localhost:9090
ADMIN_USER=admin
ADMIN_PASSWORD=test1234
ENABLE_API_KEY=true
PORT=4000
TRENTO_WEB_ORIGIN=trento.example.com
SECRET_KEY_BASE=some-secret
ACCESS_TOKEN_ENC_SECRET=some-secret
REFRESH_TOKEN_ENC_SECRET=some-secret
```
> **Note:** Add `CHARTS_ENABLED=false` in Trento web configuration file if Prometheus is not installed or you don't want to use the charts feature of Trento.

Optionally, the [alerting system to receive email notifications](https://github.com/trento-project/web/blob/main/guides/alerting/alerting.md) can be enabled by setting `ENABLE_ALERTING` to `true` and adding these additional entries:

```
# /etc/trento/trento-web
ENABLE_ALERTING=true
ALERT_SENDER=<<SENDER_EMAIL_ADDRESS>>
ALERT_RECIPIENT=<<RECIPIENT_EMAIL_ADDRESS>>
SMTP_SERVER=<<SMTP_SERVER_ADDRESS>>
SMTP_PORT=<<SMTP_PORT>>
SMTP_USER=<<SMTP_USER>>
SMTP_PASSWORD=<<SMTP_PASSWORD>>
```

#### trento-wanda configuration

```
# /etc/trento/trento-wanda
CORS_ORIGIN=http://localhost
AMQP_URL=amqp://trento_user:trento_user_password@localhost:5672/vhost
DATABASE_URL=ecto://wanda_user:wanda_password@localhost/wanda
PORT=4001
SECRET_KEY_BASE=some-secret
ACCESS_TOKEN_ENC_SECRET=some-secret
```

#### Start the services

Enable and start the services:

```bash
systemctl enable --now trento-web trento-wanda
```

#### Monitor the services

Check if the services are up and running properly by using `journalctl`.

For example:

```bash
journalctl -fu trento-web
```

### Install Trento using Docker

#### Install Docker container runtime

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

#### Create a dedicated Docker network for Trento

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

#### Install Trento on docker

1. Create the secret environment variables:
    >Note: Consider using an environment variable file, learn more about from [official Docker documentation](https://docs.docker.com/engine/reference/commandline/run/#env). Adjust upcoming commands for env file usage.
    ```bash
    WANDA_SECRET_KEY_BASE=$(openssl rand -out /dev/stdout 48 | base64)
    TRENTO_SECRET_KEY_BASE=$(openssl rand -out /dev/stdout 48 | base64)
    ACCESS_TOKEN_ENC_SECRET=$(openssl rand -out /dev/stdout 48 | base64)
    REFRESH_TOKEN_ENC_SECRET=$(openssl rand -out /dev/stdout 48 | base64)
    ```

1. Install trento-wanda on docker:

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

1. Install trento-web on docker

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

### Validate the health status of trento web and wanda
Trento web and wanda services correct functioning could be validated accessing the `healthz` and `readyz` api.

1. Test Trento web health status with `curl`:
    ```bash
    curl http://localhost:4000/api/readyz
    ```
    ```bash
    curl http://localhost:4000/api/healthz
    ```

1. Test Trento wanda health status with `curl`:
    ```bash
    curl http://localhost:4001/api/readyz
    ```
    ```bash
    curl http://localhost:4001/api/healthz
    ```

Expected output if Trento web/wanda is ready and the database connection is setup correctly:
```
{"ready":true}{"database":"pass"}
```

## Single Sign-on Integrations

Trento can be integrated with an identity provider (IDP) that uses different Single sign-on (SSO) protocols like OpenID Connect (OIDC) and Open Authorization 2.0 (OAuth 2).

> [!NOTE]  
> Trento cannot start with multiple SSO options together, so only one can be chosen.

### User Roles and Authentication

User authentication is entirely managed by the IDP, which is responsible for maintaining user accounts.
A user, who does not exist on the IDP, is unable to access the Trento web console.
During the installation process, a default admin user is defined using the `ADMIN_USER` variable, which defaults to `admin`. If the authenticated user’s IDP username matches this admin user's username, that user is automatically granted `all:all` permissions within Trento.
User permissions are entirely managed by Trento, they are not imported from the IDP. The abilities must be granted by some user with `all:all` or `all:users` abilities (**admin user initially**).

### OpenID Connect

Trento integrates with an IDP that uses the OIDC protocol to authenticate users accessing the Trento web console. Authorization for specific abilities/permissions is managed by Trento, which means that only basic user information is retrieved from the external IDP.

#### Enabling OIDC

OIDC authentication is **disabled by default**.

##### Enabling OIDC when using RPM packages

Provide the following environment variables to trento-web configuration, which is stored at `/etc/trento/trento-web` and restart the application to enable OIDC integration.

```
# Required:
ENABLE_OIDC=true
OIDC_CLIENT_ID=<<OIDC_CLIENT_ID>>
OIDC_CLIENT_SECRET=<<OIDC_CLIENT_SECRET>>
OIDC_BASE_URL=<<OIDC_BASE_URL>>

# Optional:
OIDC_CALLBACK_URL=<<OIDC_CALLBACK_URL>>
```
##### Enabling OIDC when using Docker images

Provide the following environment variables to the docker container and restart the application to enable OIDC integration.

```bash
docker run -d \
-p 4000:4000 \
--name trento-web \
--network trento-net \
--add-host "host.docker.internal:host-gateway" \

...[other settings]...

# Required:
-e ENABLE_OIDC=true  \
-e OIDC_CLIENT_ID=<<OIDC_CLIENT_ID>> \
-e OIDC_CLIENT_SECRET=<<OIDC_CLIENT_SECRET>> \
-e OIDC_BASE_URL=<<OIDC_BASE_URL>> \

# Optional:
-e OIDC_CALLBACK_URL=<<OIDC_CALLBACK_URL>> \

...[other settings]...
```

### OAuth 2.0

Trento integrates with an IDP that uses the OAuth 2 protocol to authenticate users accessing the Trento web console. Authorization for specific abilities/permissions is managed by Trento, which means that only basic user information is retrieved from the external IDP.

#### Enabling OAuth 2.0

OAuth 2.0 authentication is **disabled by default**.

##### Enabling OAuth 2.0 when using RPM packages

Provide the following environment variables to trento-web configuration, which is stored at `/etc/trento/trento-web` and restart the application to enable OAuth 2.0 integration.

```
# Required:
ENABLE_OAUTH2=true
OAUTH2_CLIENT_ID=<<OAUTH2_CLIENT_ID>>
OAUTH2_CLIENT_SECRET=<<OAUTH2_CLIENT_SECRET>>
OAUTH2_BASE_URL=<<OAUTH2_BASE_URL>>
OAUTH2_AUTHORIZE_URL=<<OAUTH2_AUTHORIZE_URL>>
OAUTH2_TOKEN_URL=<<OAUTH2_TOKEN_URL>>
OAUTH2_USER_URL=<<OAUTH2_USER_URL>>

# Optional:
OAUTH2_SCOPES=<<OAUTH2_SCOPES>>
OAUTH2_CALLBACK_URL=<<OAUTH2_CALLBACK_URL>>
```

> **Note:** OAUTH2_SCOPES is an optional variable with the default value `openid profile email`. OAUTH2_SCOPES must be adjusted depending on IDP provider requirements.

##### Enabling OAuth 2.0 when using Docker images

Provide the following environment variables to the docker container and restart the application to enable OAuth 2.0 integration.

```bash
docker run -d \
-p 4000:4000 \
--name trento-web \
--network trento-net \
--add-host "host.docker.internal:host-gateway" \

...[other settings]...

-e ENABLE_OAUTH2=true  \
-e OAUTH2_CLIENT_ID=<<OAUTH2_CLIENT_ID>> \
-e OAUTH2_CLIENT_SECRET=<<OAUTH2_CLIENT_SECRET>> \
-e OAUTH2_BASE_URL=<<OAUTH2_BASE_URL>> \
-e OAUTH2_AUTHORIZE_URL=<<OAUTH2_AUTHORIZE_URL>> \
-e OAUTH2_TOKEN_URL=<<OAUTH2_TOKEN_URL>> \
-e OAUTH2_USER_URL=<<OAUTH2_USER_URL>> \

# Optional:
-e OAUTH2_SCOPES=<<OAUTH2_SCOPES>>  \
-e OAUTH2_CALLBACK_URL=<<OAUTH2_CALLBACK_URL>> \

...[other settings]...
```

> **Note:** OAUTH2_SCOPES is an optional variable with the default value `openid profile email`. OAUTH2_SCOPES must be adjusted depending on IDP provider requirements.

### SAML

Trento integrates with an IDP that uses the SAML protocol to authenticate users accessing the Trento web console. Authorization for specific abilities/permissions is managed by Trento, which means that only basic user information is retrieved from the external IDP.

In order to use an existing SAML IDP, some requirements must be met, configuring the IDP and starting Trento in a specific way. Follow the next instructions to properly setup both.

#### SAML IDP setup

Configure the existing IDP with the next minimum options to be able to connect with Trento's Service Provider (SP).

##### SAML user profile

Users provided by the SAML installation must have some few mandatory attributes in order to login in Trento. All of them are mandatory, even though their name is configurable.
The user profile must include attributes for: username, email, first name and last name.
This attributes must be mapped for all users wanting to connect to Trento.

By default, Trento expects the `username`, `email`, `firstName` and `lastName` attribute names. All these 4 attribute names are configurable using the next environment variables, following the same order: `SAML_USERNAME_ATTR_NAME`, `SAML_EMAIL_ATTR_NAME`, `SAML_FIRSTNAME_ATTR_NAME` and `SAML_LASTNAME_ATTR_NAME`.
So for example, if the IDP user profile username is defined as `attr:username`, `SAML_USERNAME_ATTR_NAME=attr:username` should be used.

##### Signing keys

Commonly, SAML protocol messages are signed with SSL. This is optional using Trento, and the signing is not required (even though it is recommended).
If the IDP signs the messages, and expect signed messages back, certificates used by the SP (Trento in this case) must be provided to the IDP, the Certificate file in this case.

For this reason, Trento already provides a certificates set created during the installation. When Trento is installed the first time (does not matter the installation mode) the certificates are created, and the public certificate file content is available in the `http://localhost:4000/api/public_keys` route. Copy the content of the certificate from there, and provide it to the IDP. This way, the IDP will sign and verify the messages sent by both ends.

When this certificate is used, once it is provided to the IDP, the IDP recreates its own `metadata.xml` file, which defines which certificate is used to sign the messages by both sides. At this point, Trento Web must be restarted to use the new `metadata.xml` content. If `SAML_METDATA_CONTENT` option is used, this variable content must be updated with the new content. In the other hand, if `SAML_METADATA_URL` is used, the new content is automatically obtained. Otherwise, the communication fails as they don't recognize the messages signature.

**This restart must be done manually, by the admin. If the installation is done by a `rpm`, restarting the `systemd` daemon. If the installation is done using `docker`, the container must be restarted.**

##### SAML redirect URI

Once the login is done succesfully, the IDP redirects the session back to Trento. This redirection is done to `https://trento.example.com/sso/sp/consume/saml`, so this URI must be set as valid in the IDP.

#### Enabling SAML

SAML authentication is **disabled by default**.

##### Enabling SAML when using RPM packages

Provide the following environment variables to trento-web configuration, which is stored at `/etc/trento/trento-web` and restart the application to enable SAML integration.

```
# Required:
ENABLE_SAML=true
SAML_IDP_ID=<<SAML_IDP_ID>>
SAML_SP_ID=<<SAML_SP_ID>>
# One of SAML_METADATA_URL or SAML_METADATA_CONTENT
SAML_METADATA_URL=<<SAML_METADATA_URL>>
SAML_METADATA_CONTENT=<<SAML_METADATA_CONTENT>>

# Optional:
SAML_IDP_NAMEID_FORMAT=<<SAML_IDP_NAMEID_FORMAT>>
SAML_SP_DIR=<<SAML_SP_DIR>>
SAML_SP_ENTITY_ID=<<SAML_SP_ENTITY_ID>>
SAML_SP_CONTACT_NAME=<<SAML_SP_CONTACT_NAME>>
SAML_SP_CONTACT_EMAIL=<<SAML_SP_CONTACT_EMAIL>>
SAML_SP_ORG_NAME=<<SAML_SP_ORG_NAME>>
SAML_SP_ORG_DISPLAYNAME=<<SAML_SP_ORG_DISPLAYNAME>>
SAML_SP_ORG_URL=<<SAML_SP_ORG_URL>>
SAML_USERNAME_ATTR_NAME=<<SAML_USERNAME_ATTR_NAME>>
SAML_EMAIL_ATTR_NAME=<<SAML_EMAIL_ATTR_NAME>>
SAML_FIRSTNAME_ATTR_NAME=<<SAML_FIRSTNAME_ATTR_NAME>>
SAML_LASTNAME_ATTR_NAME=<<SAML_LASTNAME_ATTR_NAME>>
SAML_SIGN_REQUESTS=<<SAML_SIGN_REQUESTS>>
SAML_SIGN_METADATA=<<SAML_SIGN_METADATA>>
SAML_SIGNED_ASSERTION=<<SAML_SIGNED_ASSERTION>>
SAML_SIGNED_ENVELOPES=<<SAML_SIGNED_ENVELOPES>>
```

##### Enabling SAML when using Docker images

Provide the following environment variables to the docker container and restart the application to enable SAML integration.

```bash
docker run -d \
-p 4000:4000 \
--name trento-web \
--network trento-net \
--add-host "host.docker.internal:host-gateway" \

...[other settings]...

-e ENABLE_SAML=true
-e SAML_IDP_ID=<<SAML_IDP_ID>> \
-e SAML_SP_ID=<<SAML_SP_ID>> \
# One of SAML_METADATA_URL or SAML_METADATA_CONTENT
-e SAML_METADATA_URL=<<SAML_METADATA_URL>> \
-e SAML_METADATA_CONTENT=<<SAML_METADATA_CONTENT>> \

# Optional:
-e SAML_IDP_NAMEID_FORMAT=<<SAML_IDP_NAMEID_FORMAT>> \
-e SAML_SP_DIR=<<SAML_SP_DIR>> \
-e SAML_SP_ENTITY_ID=<<SAML_SP_ENTITY_ID>> \
-e SAML_SP_CONTACT_NAME=<<SAML_SP_CONTACT_NAME>> \
-e SAML_SP_CONTACT_EMAIL=<<SAML_SP_CONTACT_EMAIL>> \
-e SAML_SP_ORG_NAME=<<SAML_SP_ORG_NAME>> \
-e SAML_SP_ORG_DISPLAYNAME=<<SAML_SP_ORG_DISPLAYNAME>> \
-e SAML_SP_ORG_URL=<<SAML_SP_ORG_URL>> \
-e SAML_USERNAME_ATTR_NAME=<<SAML_USERNAME_ATTR_NAME>> \
-e SAML_EMAIL_ATTR_NAME=<<SAML_EMAIL_ATTR_NAME>> \
-e SAML_FIRSTNAME_ATTR_NAME=<<SAML_FIRSTNAME_ATTR_NAME>> \
-e SAML_LASTNAME_ATTR_NAME=<<SAML_LASTNAME_ATTR_NAME>> \
-e SAML_SIGN_REQUESTS=<<SAML_SIGN_REQUESTS>> \
-e SAML_SIGN_METADATA=<<SAML_SIGN_METADATA>> \
-e SAML_SIGNED_ASSERTION=<<SAML_SIGNED_ASSERTION>> \
-e SAML_SIGNED_ENVELOPES=<<SAML_SIGNED_ENVELOPES>> \

...[other settings]...
```

### SAML usage variables

Find in this table the SAML integration options and their default values:

| Name                           | Description                                                                                                      | Default                                     |
| SAML_IDP_ID                    | SAML IDP id                                                                                                      |                                             |
| SAML_SP_ID                     | SAML SP id                                                                                                       |                                             |
| SAML_METADATA_URL              | URL to retrieve the SAML metadata xml file. One of `SAML_METADATA_URL` or `SAML_METADATA_CONTENT` is required    |                                             |
| SAML_METADATA_CONTENT          | One line string containing the SAML metadata xml file content (`SAML_METADATA_URL` has precedence over this)     |                                             |
| SAML_IDP_NAMEID_FORMAT         | SAML IDP name id format, used to interpret the attribute name. Whole urn string must be used                     | urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified |
| SAML_SP_DIR                    | SAML SP directory, where SP specific required files (such as certificates and metadata file) are placed          | /etc/trento/trento-web/saml                 |
| SAML_SP_ENTITY_ID              | SAML SP entity id. If it is not given, value from the metadata.xml file is used                                  |                                             |
| SAML_SP_CONTACT_NAME           | SAML SP contact name                                                                                             | "Trento SP Admin"                           |
| SAML_SP_CONTACT_EMAIL          | SAML SP contact email                                                                                            | "admin@trento.suse.com"                     |
| SAML_SP_ORG_NAME               | SAML SP organization name                                                                                        | "Trento SP"                                 |
| SAML_SP_ORG_DISPLAYNAME        | SAML SP organization display name                                                                                | "SAML SP build with Trento"                 |
| SAML_SP_ORG_URL                | SAML SP organization url                                                                                         | https://www.trento-project.io/              |
| SAML_USERNAME_ATTR_NAME        | SAML user profile "username" attribute field name. This attribute must exist in the IDP user                     | username                                    |
| SAML_EMAIL_ATTR_NAME           | SAML user profile "email" attribute field name. This attribute must exist in the IDP user                        | email                                       |
| SAML_FIRSTNAME_ATTR_NAME       | SAML user profile "first name" attribute field name. This attribute must exist in the IDP user                   | firstName                                   |
| SAML_LASTNAME_ATTR_NAME        | SAML user profile "last name" attribute field name. This attribute must exist in the IDP user                    | lastName                                    |
| SAML_SIGN_REQUESTS             | Sign SAML requests in the SP side                                                                                | true                                        |
| SAML_SIGN_METADATA             | Sign SAML metadata documents in the SP side                                                                      | true                                        |
| SAML_SIGNED_ASSERTION          | Require to receive SAML assertion signed from the IDP. Set to false if the IDP doesn't sign the assertion        | true                                        |
| SAML_SIGNED_ENVELOPES          | Require to receive SAML envelopes signed from the IDP. Set to false if the IDP doesn't sign the envelopes        | true                                        |

## Prepare SSL certificate for NGINX

Create or provide a certificate for [NGINX](https://nginx.org/en/) to enable SSL for Trento.
This is a basic guide for creating a self-signed certificate for use with Trento. You may use your own certificate. For detailed instructions, consult the [OpenSSL documentation](https://www.openssl.org/docs/man1.0.2/man5/x509v3_config.html).

### Option 1: Creating a Self-Signed Certificate

1.  Generate a self signed certificate:
    > Note: Remember to adjust `subjectAltName = DNS:trento.example.com` by replacing `trento.example.com` with your own domain and change the value `5` to the number of days for which you need the certificate to be valid. For example, `-days 365` for one year.

    ```bash
    openssl req -newkey rsa:2048 --nodes -keyout trento.key -x509 -days 5 -out trento.crt -addext "subjectAltName = DNS:trento.example.com"
    ```

1.  Move the generated trento.key in a location accessible by nginx:
    ```bash
    mv trento.key /etc/ssl/private/trento.key
    ```
1.  Move the generated trento.crt in a location accessible by nginx:
    ```bash
    mv trento.crt /etc/ssl/certs/trento.crt
    ```

### Option 2: Using Let's Encrypt for a Signed Certificate using PackageHub repository

> **Note:** Using a different Service Pack than SP5 requires to change repository: [SLE15 SP3: `SUSEConnect --product PackageHub/15.3/x86_64`,SLE15 SP4: `SUSEConnect --product PackageHub/15.4/x86_64`].
> Users should assess the suitability of these packages based on their own risk tolerance and support needs.

1.  Add PackageHub if not already added:

    ```bash
    SUSEConnect --product PackageHub/15.5/x86_64
    zypper refresh
    ```

1.  Install Certbot and its Nginx plugin:

    ```bash
    zypper install certbot python3-certbot-nginx
    ```

1.  Obtain a certificate and configure Nginx with Certbot:
    > **Note:** Replace `example.com` with your domain. For more information, visit [Certbot instructions for Nginx](https://certbot.eff.org/instructions?ws=nginx&os=leap)

    ```bash
    certbot --nginx -d example.com -d www.example.com
    ```

    > **Note:** Certbot certificates last for 90 days. Refer to the above link for details on how to renew periodically.

## Install and configure NGINX

1. Install NGINX package:

    ```bash
    zypper install nginx
    ```

1. If firewalld is running, add firewalld exceptions for HTTP and HTTPS:

    ```bash
    firewall-cmd --zone=public --add-service=https --permanent
    firewall-cmd --zone=public --add-service=http --permanent
    firewall-cmd --reload
    ```
1. Start and enable nginx:

    ```bash
    systemctl enable --now nginx
    ```

1. Create a configuration file for Trento:

    ```bash
    vim /etc/nginx/conf.d/trento.conf
    ```

1. Add the following configuration to `/etc/nginx/conf.d/trento.conf`:

    ```
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
        location ~ ^/(api/checks|api/v1/checks|api/v2/checks|api/v3/checks)/  {
            allow all;

            # Proxy Headers
            proxy_http_version 1.1;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header Host $http_host;
            proxy_set_header X-Cluster-Client-Ip $remote_addr;

            # Important Websocket Bits!
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

1. Check NGINX configuration:

    ```bash
    nginx -t
    ```

    If the configuration is correct, the output should be like this:
    ```bash
    nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
    nginx: configuration file /etc/nginx/nginx.conf test is successful
    ```
    If there are issues with the configuration, the output will indicate what needs to be adjusted.

1. Reload Nginx to apply changes:

    ```bash
    systemctl reload nginx
    ```

## Accessing the trento-web UI

Open a browser and navigate to `https://trento.example.com`. You should be able to login using the credentials you provided in the `ADMIN_USERNAME` and `ADMIN_PASSWORD` environment variables.