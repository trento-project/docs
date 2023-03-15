# 9. Add Faker for Wanda

Date: 2023-02-09

## Status

Accepted

## Context

Since the switch to use Wanda, we currently don't have a way to generate fake execution data to be used for our demo environment. The demo environment
is needed to showcase the functionality of the checks, which is a core aspect of Trento. The current implementation uses live data, which is not ideal
for demonstration purposes. A Faker-based implementation will provide a safe and controlled environment for demos.

## Decision

We will implement the faked demo environment data creation in Wanda. These are the main reasons:

- We already have a factory module which takes care of generating such fake data for the purpose of testing.
- Generating such data in a consistent way is not a trivial task.
- Generating this data in wanda itself and not in the web brings us closer to simulating the real flow of an execution. We could use mocked agents
  but that would already increase the complexity of a deployment.

## Consequences

- The demo environment will have more realistic data without the complexity of executing tests in real infrastructure
  providing a safer and more controlled environment for demonstrations.
- The Faker-based implementation may not accurately reflect the behavior of the live implementation, so care must be taken to ensure that the demo environment is representative of the actual system.
- The Faker-based implementation will require maintenance if the ServerBehaviour changes, to ensure that it continues to accurately reflect the requirements for demonstration purposes.
