# SSL Certificate creation and setup Guide for Pull Request Environments

This guide outlines the process for creating and setting up SSL certificates for pull request environments using Let's Encrypt and AWS Route 53.

This also the process we currenly apply upon expiration in order to generate new valid ones.

## Generating the Certificate

Run the following command to start the certificate generation process:

```bash
certbot certonly --manual --preferred-challenges dns -d "*.<the-domain>"
```

The command prompts to create a DNS TXT record for domain verification and it waits for action to proceed:

```
Please deploy a DNS TXT record under the name
_acme-challenge.<the-domain> with the following value:

<very_long_and_random_string>

Before continuing, verify the record is deployed.
```

## Updating DNS Records in AWS Route 53

1. Log in to the AWS Management Console
2. Navigate to the Route 53 service
3. Select the hosted zone matching `<the-domain>`
4. Find the TXT record for `_acme-challenge.<the-domain>`
5. Update its value with the `<very_long_and_random_string>` provided by certbot
6. Wait a few moments for DNS propagation to complete
7. Return to the terminal and press Enter to continue the certificate generation process

## Certificate Files

After successful verification, the certificates and keys will be available at:
```
/etc/letsencrypt/live/<the-domain>/
```

## Updating GitHub Action Secrets

The final step is to update the CI secrets in GitHub:

1. Navigate to [Web's Actions secrets and variables](https://github.com/trento-project/web/settings/secrets/actions)
2. Update the `PR_ENV_SSL_CERT` secret:
   ```bash
   cat /etc/letsencrypt/live/<the-domain>/fullchain.pem | base64
   ```
   Copy the output and paste it as the value for `PR_ENV_SSL_CERT`

3. Update the `PR_ENV_SSL_CERT_KEY` secret:
   ```bash
   cat /etc/letsencrypt/live/<the-domain>/privkey.pem | base64
   ```
   Copy the output and paste it as the value for `PR_ENV_SSL_CERT_KEY`

Once completed, the pull request environments will use the new SSL certificate.