# 7. Use JWT tokens as authentication mechanism

Date: 2022-12-06

## Status

Accepted

## Context

We have cookie based authentication in place on the trento-web project. The decision was made based on previous requirements but with the evolution of the `trento platform` we need a different authentication method.
The authentication method should be cookie-less, stateless and capable of authenticating more services with a single authentication token.

The new service, `wanda`, responsible for the new check engine execution, needs an authentication mechanism.

The new authentication solution should be based on standards and should be easy and appropriate to integrate into both Single Page Applications and raw API consumption.

## Decision

Decided on [JWT](https://jwt.io) token-based authentication.

We don't want to use an API gateway and an external identity provider because the effort of deploying and maintaining these new pieces of architecture does not make sense right now.

We want to use the web dashboard as an identity provider and authentication coordinator, this is a good compromise between the level of security we need and the type of application we are building right now. The choice of JWT as a token standard implies that a future switch to an external identity provider and/or API gateway will be a painless and easy procedure for our applications. 

We considered using an external identity provider, like [Keycloak](https://www.keycloak.org/) or [Kratos](https://www.ory.sh/kratos/), in conjunction with a Kubernetes-compatible api gateway, the cost of that solution was too heavy and not appropriate for the current context.  

The authentication procedure will be handled by [Pow](https://github.com/danschultzer/pow), the authentication library we **already** use on the web dashboard. 
We change the underlying credentials dispatcher, to send the user a JWT access token, with a refresh JWT token for the refresh procedure.

## Consequences

We remove the old authentication eex templates, served directly by Phoenix.
The single page application will include a login page.
The single page application will handle the access token authentication with the refresh flow.
All the new services will use the JWT authentication mechanism
The web dashboard will be the identity provider of the trento users.