# 9. Add Faker for Wanda

Date: 2023-02-09

## Status

Accepted

## Context

A demo environment is needed to showcase the functionality of the execution server. The current implementation uses live data, which is not ideal for demonstration purposes. A Faker-based implementation will provide a safe and controlled environment for demos.

## Decision

1.  Create a new Elixir module that implements the ServerBehaviour using the Faker library.
2.  Add a configuration for the demo environment to use the Faker-based implementation instead of the live implementation.
3.  Test it by deploy a demo environment using the Faker-based implementation to ensure that it meets the requirements for demonstrating the functionality of the execution server.

## Consequences

- The demo environment will no longer rely on live data, providing a safer and more controlled environment for demonstrations.
- The Faker-based implementation may not accurately reflect the behavior of the live implementation, so care must be taken to ensure that the demo environment is representative of the actual system.
- The Faker-based implementation will require maintenance if the ServerBehaviour changes, to ensure that it continues to accurately reflect the requirements for demonstration purposes.

