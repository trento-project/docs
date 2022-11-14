# Elixir coding standards

## Style Guide

Trento follows the [Credo style guide](https://github.com/rrrene/elixir-style-guide).

### Linting

The linting is enforced by the [credo tool](https://github.com/rrrene/credo) locally and in the CI.

Use the [.credo.exs template](../templates/.credo.exs) as a starting point for your project.

### Additional rules and exceptions

- Private functions must appear after public functions in order of usage.

## Static analysis

[Dialyzer](https://github.com/jeremyjh/dialyxir) must be used to check for type correctness.

Please write specs `@spec` tags for all public functions and typespecs for defined types, to help Dialyzer doings its job.

## CI

Please use the [elixir.yml template](../templates/elixir.yml) as a starting point for your project.

## Documentation

Use [ExDoc](https://github.com/elixir-lang/ex_doc) to generate the documentation for the project.

Please add relevant documentation to `@moduledoc` and `@doc` attributes and make sure to run `mix docs` to check the generated documentation before submitting a PR.

Repositories that don't publish a package to Hex, should publish the generated documentation to GitHub pages using the [generate-elixir-docs action](../templates/elixir-ci.yaml).

## Testing

Testing guidelines:

- [Mocks and explicit contracts](https://dashbit.co/blog/mocks-and-explicit-contracts)

- [Controller tests as integration tests](https://groups.google.com/g/elixir-ecto/c/BKpLf092dWs/m/VaCvfZpEBQAJ) (_pre-Phoenix Context_ but still relevant)

## Phoenix

Guidelines for applications using Phoenix:

- Use the [Phoenix documentation](https://hexdocs.pm/phoenix/overview.html) as a starting point for your project.
- Always refer to the [Ecto documentation](https://hexdocs.pm/ecto/Ecto.html).
- Start with [generators](https://hexdocs.pm/phoenix/contexts.html#starting-with-generators) when possible, as they give a reference for the directory structure and naming.
- Use [realworld example app](https://github.com/gothinkster/elixir-phoenix-realworld-example-app) as a reference for the directory structure, naming and code organization in general.
- Instead of [Router Path helpers](https://hexdocs.pm/phoenix/routing.html#path-helpers), prefer using the full path in the tests (e.g. `/api/rabbits`) to test that the route is correct.
- Document APIs using [OpenAPI](https://github.com/open-api-spex/open_api_spex), cast and validate operations in controllers using the provided [plug](https://github.com/open-api-spex/open_api_spex#validating-and-casting-params), and test controllers using [OpenAPISpex.TestAssertions](https://github.com/open-api-spex/open_api_spex#validate-responses).
