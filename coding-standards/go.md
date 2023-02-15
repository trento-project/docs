# Golang coding standards

## Linting

Linting is enforced by [golangci-lint](https://golangci-lint.run) locally and in the CI pipeline.
Use the [.golangci.yaml template](../templates/.golangci.yaml) as a starting point for your project.

## Documentation

Golang packages hosted in Github are automatically published in [pkg.go.dev](https://pkg.go.dev/) page. Include [essentialkaos/godoc-action](https://github.com/marketplace/actions/ek-godoc-action) job usage in the CI in order to speed up the publishing time.

Please add relevant documentation to the implemented functions (at least, the public ones) adding a docstring on top of the function as shown here:

```
// MyFunction runs some desired action
func MyFunction(value string) (string, error) {
...
```

## Testing

The testing is done using the standard [testing](https://pkg.go.dev/testing) library.

As generic guidelines:

- Use [testify](https://pkg.go.dev/github.com/stretchr/testify) package methods as assertions. 
- Use "_test" package name for the test file. This enforces the explicit import of the package under test making it usage closer to a real user.
- Prefer test [suite](https://pkg.go.dev/github.com/stretchr/testify/suite) usage as it groups multiples tests, enabling setup and teardown functions and improving the test output logs.
- Avoid if possible global variables usage to enable mocking in tests. Implement dependency injection as much as possible, as this enforces good code design decisions and improves testability.

### Test coverage

Test coverage is enforced by [coveralls.io](https://coveralls.io/). Please use [goveralls](github.com/mattn/goveralls) util in the CI as shown here:

```
  test:
    runs-on: ubuntu-20.04
    ...

    steps:
    ...
      - name: test
        run: make test-coverage
      - name: install goveralls
        run: go install github.com/mattn/goveralls@latest
      - name: send coverage
        env:
          COVERALLS_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: goveralls -coverprofile=covprofile -service=github
```

To enable the `covprofile` file creation, add `-covermode atomic -coverprofile=covprofile` to the `go test` command execution.