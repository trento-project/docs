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

## Code smells

The [Catalog of Elixir-specific Code Smells](https://github.com/lucasvegi/Elixir-Code-Smells) is a good reference for common code smells in Elixir.

## CI

Please use the [elixir.yml template](../templates/elixir.yml) as a starting point for your project.

## Documentation

Use [ExDoc](https://github.com/elixir-lang/ex_doc) to generate the documentation for the project.

Please add relevant documentation to `@moduledoc` and `@doc` attributes and make sure to run `mix docs` to check the generated documentation before submitting a PR.

Repositories that don't publish a package to Hex, should publish the generated documentation to GitHub pages using the [generate-elixir-docs action](../templates/elixir-ci.yaml).

## Testing

Testing guidelines:

- Read [Testing Elixir](https://pragprog.com/titles/lmelixir/testing-elixir/).
- Prefer [factories](https://github.com/thoughtbot/ex_machina) over fixtures to create test data.
- Hook to [Telemetry](https://hexdocs.pm/telemetry/readme.html) events of 3rd party packages to synchronize the test code. Find [here](https://elixirforum.com/t/testing-and-telemetry-events-how-to-test-if-they-are-sent/28273/5) a generic example and [here](https://github.com/trento-project/wanda/pull/180) another example based on AMQP connections.

- [Mocks and explicit contracts](https://dashbit.co/blog/mocks-and-explicit-contracts)

- [Controller tests as integration tests](https://groups.google.com/g/elixir-ecto/c/BKpLf092dWs/m/VaCvfZpEBQAJ) (_pre-Phoenix Context_ but still relevant)

### Test coverage

Test coverage is enforced by [coveralls.io](https://coveralls.io/). Please add [excoveralls](https://github.com/parroty/excoveralls) to the list of dependencies and setup `mix.exs` file as shown here:

```elixir
def project do
  [
    app: :yourapp,
    version: "1.0.0",
    elixir: "~> 1.0.0",
    deps: deps(),
    test_coverage: [tool: ExCoveralls],
    preferred_cli_env: [
      coveralls: :test,
      "coveralls.github": :test
    ]
  ]
end

defp deps do
  [
    {:excoveralls, "~> 0.10", only: :test}
  ]
end

# If you have a custom mix task you can override the coveralls.github task
defp aliases do
  [
    "ecto.setup": ["ecto.create", "ecto.migrate", "run priv/repo/seeds.exs"],
    "ecto.reset": ["ecto.drop", "ecto.setup"],
    test: ["ecto.create --quiet", "ecto.migrate --quiet", "test"],
    "coveralls.github": ["ecto.create --quiet", "ecto.migrate --quiet", "coveralls.github"]
  ]
end
```

The [CI template](../templates/elixir-ci.yaml#131) includes a step to upload the coverage report to coveralls.io.

Please refer to the [coveralls notification documentation](https://docs.coveralls.io/coveralls-notifications) to allow coveralls to post comments with the coverage report in the PR.

## Phoenix

Guidelines for applications using Phoenix:

- Use the [Phoenix documentation](https://hexdocs.pm/phoenix/overview.html) as a starting point for your project.
- Always refer to the [Ecto documentation](https://hexdocs.pm/ecto/Ecto.html).
- Start with [generators](https://hexdocs.pm/phoenix/contexts.html#starting-with-generators) when possible, as they give a reference for the directory structure and naming.
- Use [realworld example app](https://github.com/gothinkster/elixir-phoenix-realworld-example-app) as a reference for the directory structure, naming and code organization in general.
- Instead of [Router Path helpers](https://hexdocs.pm/phoenix/routing.html#path-helpers), prefer using the full path in the tests (e.g. `/api/rabbits`) to test that the route is correct.
- Document APIs using [OpenAPI](https://github.com/open-api-spex/open_api_spex), cast and validate operations in controllers using the provided [plug](https://github.com/open-api-spex/open_api_spex#validating-and-casting-params), and test controllers using [OpenAPISpex.TestAssertions](https://github.com/open-api-spex/open_api_spex#validate-responses).
- The [CI template](../templates/elixir-ci.yaml) includes a step to generate the Swagger UI and publish it to GitHub pages. Please refer to [this pr](https://github.com/open-api-spex/open_api_spex/pull/489) to configure the `ApiSpec` module so that it does not depend on a running `Endpoint` when generating the `openapi.json` file.
