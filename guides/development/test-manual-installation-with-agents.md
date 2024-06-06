# Testing the setup

To test the [manual installation locally](https://github.com/trento-project/docs/blob/main/guides/manual-installation.md) deploy an agent using the available `trento-agent` package. This package is already available in SLES 15 SP5, so we can install it using zypper:

```bash
zypper install trento-agent
```

## Configuring the Agent host with the Self-Signed Certificate

**Step 1**: On the Trento agent, copy the self-signed certificate `trento.crt` from the Trento erver to the agent machine with `scp` to transfer the certificate to `/etc/pki/trust/anchors/`.

```bash
scp <<TRENTO_SERVER_MACHINE_USER>>@<<TRENTO_SERVER_MACHINE_IP>>:/etc/ssl/certs/trento.crt /etc/pki/trust/anchors/
```

**Step 2**: Update the certificate store:

```bash
update-ca-certificates
```

**Step 3**: Configure the Trento agent using the `/etc/trento/agent.yaml` file.

Make sure to use `https` for the `server-url` parameter.
Refer to https://documentation.suse.com/sles-sap/trento/html/SLES-SAP-trento/index.html#sec-trento-installing-trentoagent for more details.

Example agent.yaml content:

```bash
server-url: https://trento.example.com
facts-service-url: amqp://trento_user:trento_user_password@trento.example.com:5672/vhost
api-key: <<TRENTO_API_KEY>>
```

> **Note:** Depending on your setup, adjust the configuration of `/etc/hosts` in order to point the server url https://trento.example.com.

Example of etc/hosts:

```bash
127.0.0.1	                   localhost
<<IP_ADDRESS_TRENTO_SERVER>>   trento.example.com
```
