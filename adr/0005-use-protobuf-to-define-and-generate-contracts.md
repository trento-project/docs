# 5. Use Protocol Buffers to define and generate contracts

Date: 2022-11-17

## Status

Accepted

## Context

We need to define contracts between the components of Trento to communicate with each other.
We want to use a well-known and widely adopted format to define these contracts.
We want to use a format that allows us to generate code from the contracts, avoid boilerplate code and reduce the risk of errors.

## Decision

Protocol Buffers (Protobuf) is a good candidate for this task, as it is a language-neutral, platform-neutral, extensible mechanism for serializing structured data.
A new repository will be created to host the Protocol Buffers contracts, and the generated code will be published as a Go and Elixir package to be used by the components.

## Consequences

Each component will have to import the generated code to be able to communicate with the other components.
A mapping between the Protocol Buffers contracts and the internal data structures will be needed to avoid exposing the Protocol Buffers contracts to the rest of the codebase.
