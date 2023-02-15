# 9. Add Faker for Wanda

Date: 2023-02-09

## Status

Accepted

## Context

Since the switch to use Wanda, we currently don't have a way to generate fake execution data to be used for our demo environment. The demo environment
is needed to showcase the functionality of the checks, which is a core aspect of Trento. The current implementation uses live data, which is not ideal
for demonstration purposes. A Faker-based implementation will provide a safe and controlled environment for demos.

It makes sense to implement this in Wanda rather than in the server for several reasons:

- We already have a factory module which takes care of generating such fake data for the purpose of testing.
- Generating such data in a consistent way is not a trivial task.
- Generating this data in wanda itself and not in the web brings us closer to simulating the real flow of an execution. We could use mocked agents
  but that would already increase the complexity of a deployment.

## Decision

1.  Create a new Elixir module that implements the ServerBehaviour using the Faker library.
2.  Add a configuration for the demo environment to use the Faker-based implementation instead of the live implementation.
3.  Test it by deploy a demo environment using the Faker-based implementation to ensure that it meets the requirements for demonstrating the functionality of the execution server.

## Consequences

- The demo environment will no longer rely on live data, providing a safer and more controlled environment for demonstrations.
- The Faker-based implementation may not accurately reflect the behavior of the live implementation, so care must be taken to ensure that the demo environment is representative of the actual system.
- The Faker-based implementation will require maintenance if the ServerBehaviour changes, to ensure that it continues to accurately reflect the requirements for demonstration purposes.
