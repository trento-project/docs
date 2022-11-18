# JavaScript coding standards

## Style Guide

Trento follows the [Airbnb style guide](https://github.com/airbnb/javascript), wherever possible.

## Linting

The linting is enforced through [ESLint](https://eslint.org/) locally and in the CI.

Use the [.eslintrc.js template](../templates/.eslintrc.js) as a starting point for a new project.

## Formatting

Code formatting is applied using [Prettier](https://prettier.io/), and enforced with a CI check.

Use the [.prettierrc.js template](../templates/.prettierrc.js) as a starting point for a new project.

### Additional rules and exceptions

- Always prefer an arrow function (`() => {}`) to a regular `function(){}`. It has lower memory footprint and it's more concise.
- PropTypes are being avoided for the moment when writing a new React component.

### `npm`, `yarn`, `pnpm`?

`npm`.

## Testing

End-to-end tests in production-like environments are performed using [Cypress](https://www.cypress.io/).

Unit testing of JavaScript code and React components is performed using [Jest](https://jestjs.io/) and [React Testing Library](https://testing-library.com/docs/react-testing-library).

### Testing guidelines

- Prefer factories created with [Fishery](https://github.com/thoughtbot/fishery) and [Faker](https://fakerjs.dev/) over fixtures to craft test data.
- As a rule of thumb one should avoid mocking and creating spies wherever possible.

## Books and guides

- [MDN's JavaScript documentation](https://developer.mozilla.org/en-US/docs/Web/JavaScript) _is_ the only reliable source of truth about JavaScript on the web.
- [React documentation](https://reactjs.org/docs/getting-started.html)
- [You Don't Know JS](https://github.com/getify/You-Dont-Know-JS/blob/1st-ed/README.md)
- A bit old but gold: [JavaScript: The Good Parts](https://www.oreilly.com/library/view/javascript-the-good/9780596517748/)
- [Node.JS Design Patterns](https://www.nodejsdesignpatterns.com): a good book if you want to write a full-baked JS application.
- [Redux usage guidelines](https://redux.js.org/usage/)
- [Redux: writing tests](https://redux.js.org/usage/writing-tests)
- [Testing Redux sagas](https://redux-saga.js.org/docs/advanced/Testing/)
