# 8. Rest API versioning strategy

Date: 2023-02-08

## Status

Accepted

## Context

With the growing complexity of our services, we need to stabilize and version our external rest API.
We need a standard, easy and maintainable way to deal with versioning and this guideline will affect all the present and future rest API.
This decision affects the purely technical side, involving the HTTP rest API and the policy about when API should be upgraded.

We want a clear API versioning strategy for the API consumer and also a way to express unambiguously the "latest" version of our API.

## Decision

We will implement a URL-based API versioning.
Our routes will be prefixed with `/vX`, where "X" is a progressive number that indicates the current version of the consumed API.
This means that in our projects, we need to namespace the handlers, requests and responses of our http routes.
For example in an elixir project, we want to namespace the controllers, the views and the OpenApi schemas with the version, using a module called VX (V1, V2 etc..).

This means that a consumer could choose also the right Schemas for the OpenApi spec consuming, generating a client according to a specific version.

The chosen approach, of URL-based API versioning, comes after a review of the most used approaches, including HTTP header-based versioning and mime-type versioning.

You can read [here](https://elixirforum.com/t/how-do-you-handle-api-versioning/18898) and [here](https://www.troyhunt.com/your-api-versioning-is-wrong-which-is/) to have a more comprehensive overview of what we are talking about.

We will have a "special" route, without any prefix, only `/api`. This route will perform a temporary redirect to the latest API version of our services.

For API upgrade policy we refer to [LinkedIn API Breaking Change Policy](https://learn.microsoft.com/en-us/linkedin/shared/breaking-change-policy).

## Consequences

The rest API will have a /vX prefix, where X is the API version number.
Our OpenAPI specs will be updated to benefit from this type of API versioning.
The rest API will have the special `/api` prefix, with a temporary redirect to the latest API version.

API version bump policy can be found [here](https://learn.microsoft.com/en-us/linkedin/shared/breaking-change-policy).