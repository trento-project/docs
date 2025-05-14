# Single Sign-On integration

Trento can be integrated for Single Sign-On with a third-party identity provider (IDP).


```{=docbook}
<note>
  <para>Trento cannot start with multiple SSO options together, so only one can be chosen.</para>
</note>
```

The following protocols are supported:

- OpenID Connect (OIDC)

- Open Authorization 2.0 (OAuth 2)

- Security Assertion Markup Language (SAML)

## User Roles and Authentication

User authentication is entirely managed by the IDP, which is responsible for maintaining user accounts.
A user, who does not exist on the IDP, is unable to access the Trento web console.

During the installation process, a default admin user is defined using the `ADMIN_USER` variable, which defaults to `admin`. If the authenticated user’s IDP username matches this admin user's username, that user is automatically granted `all:all` permissions within Trento.

User permissions are entirely managed by Trento, they are not imported from the IDP. The abilities must be granted by some user with `all:all` or `all:users` abilities (admin user initially). This means that only basic user information is retrieved from the external IDP.

## Using OpenID Connect

Trento integrates with an IDP that uses the OIDC protocol to authenticate users accessing the Trento web console.

By default, OIDC is disabled. You can enable OIDC when using RPM packages or using Docker images.

### Enabling OpenID Connect when using kubernetes deployment

To enable OIDC when using kubernetes deployment with helm, proceed as follows:

1. Add the following variables to the previously documented helm installation command:

   ```
   HELM_EXPERIMENTAL_OCI=1 helm ... \
      --set trento-web.oidc.enabled=true \
      --set trento-web.oidc.clientId=<OIDC_CLIENT_ID> \
      --set trento-web.oidc.clientSecret=<OIDC_CLIENT_SECRET> \
      --set trento-web.oidc.baseUrl=<OIDC_BASE_URL>
   ```


### Enabling OpenID Connect when using RPM packages

To enable OIDC when using RPM packages, proceed as follows:

1. Open the file <filename>/etc/trento/trento-web</filename>.
1. Add the following environment variables to this file.
   Required variables are:

   ```
   ENABLE_OIDC=true
   OIDC_CLIENT_ID=<OIDC_CLIENT_ID>
   OIDC_CLIENT_SECRET=<OIDC_CLIENT_SECRET>
   OIDC_BASE_URL=<OIDC_BASE_URL>
   ```

1. Optionally, add the OIDC callback URL to the configuration. This can be useful if for some reason the default callback URL cannot be used, for example, if `http` is used instead of `https`. Use the next variable for that:

    ```
    OIDC_CALLBACK_URL=<OIDC_CALLBACK_URL>
    ```

1. Restart the application.


### Enabling OpenID Connect when using Docker images

To enable OIDC when using Docker images, proceed as follows:

1. If `trento-web` container is already running stop and delete the container before continuing. For that run:

   ```bash
   docker stop trento-web
   docker rm trento-web
   ```

1. Provide the following environment variables to the Docker container via
   the `-e` option:

   ```bash
   docker run -d \
   -p 4000:4000 \
   --name trento-web \
   --network trento-net \
   --add-host "host.docker.internal:host-gateway" \

   ...[other settings]...

   # Required:
   -e ENABLE_OIDC=true \
   -e OIDC_CLIENT_ID=<OIDC_CLIENT_ID> \
   -e OIDC_CLIENT_SECRET=<OIDC_CLIENT_SECRET> \
   -e OIDC_BASE_URL=<OIDC_BASE_URL> \

   # Optional:
   -e OIDC_CALLBACK_URL=<OIDC_CALLBACK_URL> \

   ...[other settings]...
   ```


### Available variables for OpenID Connect

OIDC_CLIENT_ID

: OIDC client id

OIDC_CLIENT_SECRET

: OIDC client secret

OIDC_BASE_URL

: OIDC base url

OIDC_CALLBACK_URL

: OIDC callback url where the IDP is redirecting once the authentication is completed (default value: <uri>https://#{TRENTO_WEB_ORIGIN}/auth/oidc_callback</uri>)

## Using OAuth 2.0

Trento integrates with an IDP that uses the OAuth 2 protocol to authenticate users accessing the Trento web console.

By default, OAuth 2.0 is disabled. You can enable OIDC when using RPM packages or using Docker images.


### Enabling OAuth 2.0 when using kubernetes deployment

To enable OAuth 2.0 when using kubernetes deployment with helm, proceed as follows:

1. Add the following variables to the previously documented helm installation command:

   ```
   HELM_EXPERIMENTAL_OCI=1 helm ... \
      --set trento-web.oauth2.enabled=true \
      --set trento-web.oauth2.clientId=<OAUTH2_CLIENT_ID> \
      --set trento-web.oauth2.clientSecret=<OAUTH2_CLIENT_SECRET> \
      --set trento-web.oauth2.baseUrl=<OAUTH2_BASE_URL> \
      --set trento-web.oauth2.authorizeUrl=<OAUTH2_AUTHORIZE_URL> \
      --set trento-web.oauth2.tokenUrl=<OAUTH2_TOKEN_URL> \
      --set trento-web.oauth2.userUrl=<OAUTH2_USER_URL>
   ```

   Additionally, the following optional values are available:

   ```
   HELM_EXPERIMENTAL_OCI=1 helm ... \
      --set trento-web.oauth2.scopes=<OAUTH2_SCOPES>
   ```

### Enabling OAuth 2.0 when using RPM packages

To enable OAuth 2.0 when using RPM packages, proceed as follows:

1. Open the file <filename>/etc/trento/trento-web</filename>.
1. Add the following environment variables to this file.
   Required variables are:

   ```
   # Required:
   ENABLE_OAUTH2=true
   OAUTH2_CLIENT_ID=<OAUTH2_CLIENT_ID>
   OAUTH2_CLIENT_SECRET=<OAUTH2_CLIENT_SECRET>
   OAUTH2_BASE_URL=<OAUTH2_BASE_URL>
   OAUTH2_AUTHORIZE_URL=<OAUTH2_AUTHORIZE_URL>
   OAUTH2_TOKEN_URL=<OAUTH2_TOKEN_URL>
   OAUTH2_USER_URL=<OAUTH2_USER_URL>

   # Optional:
   OAUTH2_SCOPES=<OAUTH2_SCOPES>
   OAUTH2_CALLBACK_URL=<OAUTH2_CALLBACK_URL>
   ```

1. Restart the application.


### Enabling OAuth 2.0 when using Docker images

To enable OAuth 2.0 when using Docker images, proceed as follows:

1. If `trento-web` container is already running stop and delete the container before continuing. For that run:

   ```bash
   docker stop trento-web
   docker rm trento-web
   ```

1. Use the following environment variables to the Docker container via
   the `-e` option:

   ```bash
   docker run -d \
   -p 4000:4000 \
   --name trento-web \
   --network trento-net \
   --add-host "host.docker.internal:host-gateway" \

   ...[other settings]...

   -e ENABLE_OAUTH2=true \
   -e OAUTH2_CLIENT_ID=<OAUTH2_CLIENT_ID> \
   -e OAUTH2_CLIENT_SECRET=<OAUTH2_CLIENT_SECRET> \
   -e OAUTH2_BASE_URL=<OAUTH2_BASE_URL> \
   -e OAUTH2_AUTHORIZE_URL=<OAUTH2_AUTHORIZE_URL> \
   -e OAUTH2_TOKEN_URL=<OAUTH2_TOKEN_URL> \
   -e OAUTH2_USER_URL=<OAUTH2_USER_URL> \

   # Optional:
   -e OAUTH2_SCOPES=<OAUTH2_SCOPES> \
   -e OAUTH2_CALLBACK_URL=<OAUTH2_CALLBACK_URL> \

   ...[other settings]...
   ```

### Available variables for OAuth 2.0

OAUTH2_CLIENT_ID

: OAUTH2 client id

OAUTH2_CLIENT_SECRET

: OAUTH2 client secret

OAUTH2_BASE_URL

: OAUTH2 base url

OAUTH2_AUTHORIZE_URL

: OAUTH2 authorization url

OAUTH2_TOKEN_URL

: OAUTH2 token url

OAUTH2_USER_URL

: OAUTH2 token url

OAUTH2_SCOPES

: OAUTH2 scopes, used to define the user values sent to the SP. It must be adjusted depending on IDP provider requirements (default value: `profile email`)

OAUTH2_CALLBACK_URL

: OAUTH2 callback url where the IDP is redirecting once the authentication is completed (default value: `https://#{TRENTO_WEB_ORIGIN}/auth/oauth2_callback`)


## Using SAML

Trento integrates with an IDP that uses the SAML protocol to authenticate users accessing the Trento web console. Trento will behave as a Service Provider (SP) in this case.

Commonly, SAML protocol messages are signed with SSL. This is optional using Trento, and the signing is not required (even though it is recommended).
If the IDP signs the messages, and expect signed messages back, certificates used by the SP (Trento in this case) must be provided to the IDP, the public certificate file in this case.

To use an existing SAML IDP, follow the next instrunctions to met the specific requirements. You need:

1. Obtain metadata content from the IDP
1. Start Trento to generate the certificates and get them (SAML must be enabled for this)
1. Provide the generated certificate to the IDP
1. Configure SAML IDP and user profiles

See the following subsections for details.

### Obtaining metadata content from the IDP

The <filename>metadata.xml</filename> file defines the agreement between SP and IDP during SAML communications. It is used to identify the SAML client as well. The content of this file must be provided to Trento. Options <option>SAML_METADATA_URL</option> and <option>SAML_METADATA_CONTENT</option> are available for that.

If the <option>SAML_METADATA_CONTENT</option> option is being used, the content of this variable must be updated with the IDP metadata as single line string. On the other hand, if <option>SAML_METADATA_URL</option> is used, the new metadata is automatically fetched when Trento starts. If neither of these steps are completed, communication will fail because the message signatures will not be recognized.

If the used IDP has the endpoint to provide the <filename>metadata.xml</filename> file content, prefer the variable <option>SAML_METADATA_URL</option>. Trento will automatically fetch metadata when started.

### Getting certificates from Trento

Trento provides a certificates set created during the installation. Regardless of the installation mode, when Trento is installed the first time and SAML is enabled the certificates are created and the public certificate file content is available in the <uri>https://#{TRENTO_WEB_ORIGIN}/api/public_keys</uri> route. 

Use the following command to get the certificate content:

```bash
curl https://#{TRENTO_WEB_ORIGIN}/api/public_keys
```
    
Copy the content of the certificate from there and provide it to the IDP. This way, the IDP will sign its messages and verify the messages received from Trento.

```{=docbook}
<note>
  <para>To get the certificate using this route Trento must be configured to start with SAML enabled.</para>
</note>
```

### Configuring SAML IDP setup

Configure the existing IDP with the next minimum options to be able to connect with Trento as a Service Provider (SP).

#### Providing certificates

As commented previously, a set of certificates is needed to enable signed communication. Provide the certificate generated by Trento to the IDP (each IDP has a different way to do this). Make sure that the configured certificate is used for signing and encrypting messages.

#### Configuring SAML user profile

Users provided by the SAML installation must have some few mandatory attributes to login in Trento. The required attributes are: username, email, first name and last name. All of them are mandatory, even though their field names are configurable.

By default, Trento expects the `username`, `email`, `firstName` and `lastName` attribute names. All these 4 attribute names are configurable using the next environment variables, following the same order: `SAML_USERNAME_ATTR_NAME`, `SAML_EMAIL_ATTR_NAME`, `SAML_FIRSTNAME_ATTR_NAME` and `SAML_LASTNAME_ATTR_NAME`.

Both IDP and Trento must know how these 4 fields are mapped. To do this, follow the next instructions:

1. Add the attributes if they don't exist in the IDP user profile. If they already exist, don't change the attributes and keep their original values.

1. Configure Trento to use the IDP attribute field names. To do this, set the `SAML_USERNAME_ATTR_NAME`, `SAML_EMAIL_ATTR_NAME`, `SAML_FIRSTNAME_ATTR_NAME` and `SAML_LASTNAME_ATTR_NAME` environment values with the values configured in the IDP. For example, if the IDP user profile username is defined as `attr:username` use `SAML_USERNAME_ATTR_NAME=attr:username`.

#### Checking SAML redirect URI

After a successful login, the IDP redirects the user's session back to Trento and redirected at <uri>\https://trento.example.com/sso/sp/consume/saml</uri>. To ensure seamless SSO, this URI must be configured as valid within the IDP.

### Enabling SAML when using kubernetes deployment

To enable SAML when using kubernetes deployment with helm, proceed as follows:

1. Add the following variables to the previously documented helm installation command:

   ```
   HELM_EXPERIMENTAL_OCI=1 helm ... \
      --set trento-web.saml.enabled=true \
      --set trento-web.saml.idpId=<SAML_IDP_ID> \
      --set trento-web.saml.spId=<SAML_SP_ID> \
      --set trento-web.saml.metadataUrl=<SAML_METADATA_URL>
   ```

   To use the <option>SAML_METADATA_CONTENT</option> option rather than <option>SAML_METADATA_URL</option> use:

   ```
   HELM_EXPERIMENTAL_OCI=1 helm ... \
      --set trento-web.saml.enabled=true \
      --set trento-web.saml.idpId=<SAML_IDP_ID> \
      --set trento-web.saml.spId=<SAML_SP_ID> \
      --set trento-web.saml.metadataContent=<SAML_METADATA_CONTENT>
   ```

   Additionally, the following optional values are available:

   ```
   HELM_EXPERIMENTAL_OCI=1 helm ... \
      --set trento-web.saml.idpNameIdFormat=<SAML_IDP_NAMEID_FORMAT> \
      --set trento-web.saml.spDir=<SAML_SP_DIR> \
      --set trento-web.saml.spEntityId=<SAML_SP_ENTITY_ID> \
      --set trento-web.saml.spContactName=<SAML_SP_CONTACT_NAME> \
      --set trento-web.saml.spContactEmail=<SAML_SP_CONTACT_EMAIL> \
      --set trento-web.saml.spOrgName=<SAML_SP_ORG_NAME> \
      --set trento-web.saml.spOrgDisplayName=<SAML_SP_ORG_DISPLAYNAME> \
      --set trento-web.saml.spOrgUrl=<SAML_SP_ORG_URL> \
      --set trento-web.saml.usernameAttrName=<SAML_USERNAME_ATTR_NAME> \
      --set trento-web.saml.emailAttrName=<SAML_EMAIL_ATTR_NAME> \
      --set trento-web.saml.firstNameAttrName=<SAML_FIRSTNAME_ATTR_NAME> \
      --set trento-web.saml.lastNameAttrName=<SAML_LASTNAME_ATTR_NAME> \
      --set trento-web.saml.signRequests=<SAML_SIGN_REQUESTS> \
      --set trento-web.saml.signMetadata=<SAML_SIGN_METADATA> \
      --set trento-web.saml.signedAssertion=<SAML_SIGNED_ASSERTION> \
      --set trento-web.saml.signedEnvelopes=<SAML_SIGNED_ENVELOPES>
   ```


### Enabling SAML when using RPM packages

To enable SAML when using RPM packages, proceed as follows:

1. Open the file <filename>/etc/trento/trento-web</filename>.
1. Add the following environment variables to this file.
   Required variables are:

   ```
   # Required:
   ENABLE_SAML=true
   SAML_IDP_ID=<SAML_IDP_ID>
   SAML_SP_ID=<SAML_SP_ID>
   # Only SAML_METADATA_URL or SAML_METADATA_CONTENT must by provided
   SAML_METADATA_URL=<SAML_METADATA_URL>
   SAML_METADATA_CONTENT=<SAML_METADATA_CONTENT>

   # Optional:
   SAML_IDP_NAMEID_FORMAT=<SAML_IDP_NAMEID_FORMAT>
   SAML_SP_DIR=<SAML_SP_DIR>
   SAML_SP_ENTITY_ID=<SAML_SP_ENTITY_ID>
   SAML_SP_CONTACT_NAME=<SAML_SP_CONTACT_NAME>
   SAML_SP_CONTACT_EMAIL=<SAML_SP_CONTACT_EMAIL>
   SAML_SP_ORG_NAME=<SAML_SP_ORG_NAME>
   SAML_SP_ORG_DISPLAYNAME=<SAML_SP_ORG_DISPLAYNAME>
   SAML_SP_ORG_URL=<SAML_SP_ORG_URL>
   SAML_USERNAME_ATTR_NAME=<SAML_USERNAME_ATTR_NAME>
   SAML_EMAIL_ATTR_NAME=<SAML_EMAIL_ATTR_NAME>
   SAML_FIRSTNAME_ATTR_NAME=<SAML_FIRSTNAME_ATTR_NAME>
   SAML_LASTNAME_ATTR_NAME=<SAML_LASTNAME_ATTR_NAME>
   SAML_SIGN_REQUESTS=<SAML_SIGN_REQUESTS>
   SAML_SIGN_METADATA=<SAML_SIGN_METADATA>
   SAML_SIGNED_ASSERTION=<SAML_SIGNED_ASSERTION>
   SAML_SIGNED_ENVELOPES=<SAML_SIGNED_ENVELOPES>
   ```

1. Restart the application.

### Enabling SAML when using Docker images

To enable SAML when using Docker images, proceed as follows:

1. If `trento-web` container is already running stop and delete the container before continuing. For that run:

   ```bash
   docker stop trento-web
   docker rm trento-web
   ```

1. Use the following environment variables to the Docker container via the `-e` option:

   ```bash
   docker run -d \
   -p 4000:4000 \
   --name trento-web \
   --network trento-net \
   --add-host "host.docker.internal:host-gateway" \

   ...[other settings]...

   -e ENABLE_SAML=true
   -e SAML_IDP_ID=<SAML_IDP_ID> \
   -e SAML_SP_ID=<SAML_SP_ID> \
   # Only SAML_METADATA_URL or SAML_METADATA_CONTENT must by provided
   -e SAML_METADATA_URL=<SAML_METADATA_URL> \
   -e SAML_METADATA_CONTENT=<SAML_METADATA_CONTENT> \

   # Optional:
   -e SAML_IDP_NAMEID_FORMAT=<SAML_IDP_NAMEID_FORMAT> \
   -e SAML_SP_DIR=<SAML_SP_DIR> \
   -e SAML_SP_ENTITY_ID=<SAML_SP_ENTITY_ID> \
   -e SAML_SP_CONTACT_NAME=<SAML_SP_CONTACT_NAME> \
   -e SAML_SP_CONTACT_EMAIL=<SAML_SP_CONTACT_EMAIL> \
   -e SAML_SP_ORG_NAME=<SAML_SP_ORG_NAME> \
   -e SAML_SP_ORG_DISPLAYNAME=<SAML_SP_ORG_DISPLAYNAME> \
   -e SAML_SP_ORG_URL=<SAML_SP_ORG_URL> \
   -e SAML_USERNAME_ATTR_NAME=<SAML_USERNAME_ATTR_NAME> \
   -e SAML_EMAIL_ATTR_NAME=<SAML_EMAIL_ATTR_NAME> \
   -e SAML_FIRSTNAME_ATTR_NAME=<SAML_FIRSTNAME_ATTR_NAME> \
   -e SAML_LASTNAME_ATTR_NAME=<SAML_LASTNAME_ATTR_NAME> \
   -e SAML_SIGN_REQUESTS=<SAML_SIGN_REQUESTS> \
   -e SAML_SIGN_METADATA=<SAML_SIGN_METADATA> \
   -e SAML_SIGNED_ASSERTION=<SAML_SIGNED_ASSERTION> \
   -e SAML_SIGNED_ENVELOPES=<SAML_SIGNED_ENVELOPES> \

   ...[other settings]...
   ```

### Available variables for SAML

SAML_IDP_ID

: SAML IDP id

SAML_SP_ID

: SAML SP id

SAML_METADATA_URL

: URL to retrieve the SAML metadata xml file. One of `SAML_METADATA_URL` or `SAML_METADATA_CONTENT` is required

SAML_METADATA_CONTENT

: One line string containing the SAML metadata xml file content (`SAML_METADATA_URL` has precedence over this)

SAML_IDP_NAMEID_FORMAT

: SAML IDP name id format, used to interpret the attribute name. Whole urn string must be used (default value: `urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified`)

SAML_SP_DIR

: SAML SP directory, where SP specific required files (such as certificates and metadata file) are placed (default value: <filename>/etc/trento/saml</filename>)

SAML_SP_ENTITY_ID

: SAML SP entity id. If it is not given, value from the metadata.xml file is used

SAML_SP_CONTACT_NAME

: SAML SP contact name (default value: `Trento SP Admin`)

SAML_SP_CONTACT_EMAIL

: SAML SP contact email (default value: `admin@trento.suse.com`) 

SAML_SP_ORG_NAME

: SAML SP organization name (default value: `Trento SP`)

SAML_SP_ORG_DISPLAYNAME

: SAML SP organization display name (default value: `SAML SP build with Trento`)

SAML_SP_ORG_URL

: SAML SP organization url (default value: `https://www.trento-project.io/`)

SAML_USERNAME_ATTR_NAME

: SAML user profile "username" attribute field name. This attribute must exist in the IDP user (default value: `username`)

SAML_EMAIL_ATTR_NAME

: SAML user profile "email" attribute field name. This attribute must exist in the IDP user (default value: `email`)

SAML_FIRSTNAME_ATTR_NAME

: SAML user profile "first name" attribute field name. This attribute must exist in the IDP user (default value: `firstName`)

SAML_LASTNAME_ATTR_NAME

: SAML user profile "last name" attribute field name. This attribute must exist in the IDP user (default value: `lastName`)

SAML_SIGN_REQUESTS

: Sign SAML requests in the SP side (default value: `true`)

SAML_SIGN_METADATA

: Sign SAML metadata documents in the SP side (default value: `true`)   

SAML_SIGNED_ASSERTION

: Require to receive SAML assertion signed from the IDP. Set to false if the IDP doesn't sign the assertion (default value: `true`)

SAML_SIGNED_ENVELOPES

: Require to receive SAML envelopes signed from the IDP. Set to false if the IDP doesn't sign the envelopes (default value: `true`)
