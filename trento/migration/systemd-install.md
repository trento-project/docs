# systemd deployment

A systemd installation of Trento Server, based on rpm packages, can be done manually step-by-step. The latest available version of SUSE Linux Enterprise Server for SAP Applications is used as the base operating system, which is [SLE 15 SP5](https://www.suse.com/download/sles/) at the time of writing.
For installations on Service Packs other than SP5, ensure to update the repository address as indicated in the respective notes provided throughout this guide.

**Supported Service Packs**:

- SP3
- SP4
- SP5

## List of dependencies

- [PostgreSQL](https://www.postgresql.org/)
- [RabbitMQ](https://rabbitmq.com/)
- [NGINX](https://nginx.org/en/)
- [Prometheus](https://prometheus.io/) (optional)

## Install Trento dependencies

### Install Prometheus (Optional)

[Prometheus](https://prometheus.io/) is not required to run Trento, but it is recommended as it allows Trento to display a series of charts for each host with useful information about the CPU load, memory, and other important metrics.

> **Note:** If you choose not to install Prometheus or to provide an existing installation, ensure that `CHARTS_ENABLED` is set to false in the Trento web RPM configuration file, which is stored at `/etc/trento/trento-web`, or when it is provided to the Trento web container.

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

    > **Note:** **localhost:4000** in **url: `http://localhost:4000/api/prometheus/targets`** refers to the location where Trento web service is running.

1.  Enable and start the Prometheus service:

    ```bash
    systemctl enable --now prometheus
    ```

1.  If firewalld is running, allow Prometheus to be accessible and add an exception on firewalld:

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

   > **Note:** The `pg_hba.conf` file works in a sequential fashion. This means, that the rules positioned on the top have preference over the ones coming next. This examples shows a pretty permissive address range, so in order to work, the entries must be written in the top of the `host` entries. Find additional information in the [pg_hba.conf](https://www.postgresql.org/docs/current/auth-pg-hba-conf.html) documentation.

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

## Install Trento using RPM packages

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
> with `openssl` running `openssl rand -out /dev/stdout 48 | base64`

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

## Validate the health status of trento web and wanda

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

       ssl_certificate /etc/nginx/ssl/certs/trento.crt;
       ssl_certificate_key /etc/ssl/private/trento.key;

       ssl_protocols TLSv1.2 TLSv1.3;
       ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384';
       ssl_prefer_server_ciphers on;
       ssl_session_cache shared:SSL:10m;

       # Wanda rule
       location ~ ^/(api/checks|api/v1/checks|api/v2/checks|api/v3/checks|api/groups|api/v1/groups|api/operations|api/v1/operations)/  {
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


## Prepare SSL certificate for NGINX

Create or provide a certificate for [NGINX](https://nginx.org/en/) to enable SSL for Trento.
Instead of creating a self-signed certificate, you use your own certificate.

### Option 1: Creating a Self-Signed Certificate

1.  Generate a self-signed certificate:

    > Note: Remember to adjust `subjectAltName = DNS:trento.example.com` by replacing `trento.example.com` with the actual domain name, and change the value `5` to the number of days for the certificate validity. For example, `-days 365` for one year.

    ```bash
    openssl req -newkey rsa:2048 --nodes -keyout trento.key -x509 -days 5 -out trento.crt -addext "subjectAltName = DNS:trento.example.com"
    ```

1.  Copy the generated trento.key to a location accessible by NGINX:
    ```bash
    cp trento.key /etc/ssl/private/trento.key
    ```

1.  Create a directory for the generated trento.crt file. The directory must be accessible by NGINX:
   
    ```bash
    mkdir -p /etc/nginx/ssl/certs/
    ```

1.  Copy the generated trento.crt file to the created directory:
   
    ```bash
    cp trento.crt /etc/nginx/ssl/certs/trento.crt
    ```

1. Reload NGINX to apply changes:

   ```bash
   systemctl reload nginx
   ```

### Option 2: Create a signed-certificate with Let's Encrypt using PackageHub repository

> **Note:** Change repository if you use a Service Pack other than SP5. For example: [SLE15 SP3: `SUSEConnect --product PackageHub/15.3/x86_64`,SLE15 SP4: `SUSEConnect --product PackageHub/15.4/x86_64`].
> Use packages in PackageHub at your own risk.

1.  Add PackageHub, if it is not already added:

    ```bash
    SUSEConnect --product PackageHub/15.5/x86_64
    zypper refresh
    ```

1.  Install Certbot and its NGINX plugin:

    ```bash
    zypper install certbot python3-certbot-nginx
    ```

1.  Obtain a certificate and configure Nginx with Certbot:

    > **Note:** Replace `example.com` with your domain. For more information, visit [Certbot instructions for Nginx](https://certbot.eff.org/instructions?ws=nginx&os=leap)

    ```bash
    certbot --nginx -d example.com -d www.example.com
    ```

    > **Note:** Certbot certificates are valid for 90 days. Refer to the above link for details on how to renew periodically.
## Accessing the trento-web UI

Use a browser to navigate to `https://trento.example.com`, and log in using the credentials you specified in the `ADMIN_USER` and `ADMIN_PASSWORD` environment variables.
