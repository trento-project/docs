# 19. E2E Testing Practices & Page Object Implementation

Date: 2025-04-25

## Status

Accepted

## Context

Our current End-to-End (E2E) test suite, implemented using Cypress, has evolved organically over time. While it provides valuable coverage for critical user flows, we have identified several key areas that require improvement.

Specifically, we are facing the following challenges:

- Significant Code Duplication: A considerable amount of code is repeated across different test files and scenarios. This makes the test suite harder to maintain, increases its overall size, and makes it more prone to inconsistencies.

- Lack of a Dedicated Test Repository with Natural Language Readability: The current structure lacks a central repository or methodology for organizing tests in a way that clearly and intuitively describes the functionality being tested. This makes it difficult for team members (especially those less familiar with the codebase) to understand the scope and purpose of our test suite simply by reviewing the file structure and names.

- Limited Code Reusability: We are not effectively reusing test logic, helper functions, or common interaction patterns across different tests. This contributes to the code duplication issue and increases the effort required to create new tests.

- Suboptimal Element Interaction (Reliance on Cypress Utilities): Our current implementation heavily relies on Cypress's built-in utility functions for selecting and interacting with elements. While these utilities are powerful, they can sometimes lead to less resilient and harder-to-understand selectors compared to more explicit and targeted approaches.

- Absence of the Page Object Model (POM): The test logic for interacting with specific parts of the application is often embedded directly within the test files. This tightly couples the tests to the UI structure, making them more susceptible to breaking changes and reducing their readability and maintainability. The lack of a Page Object Model makes it harder to isolate UI interactions and business logic.

- Reduced Test Isolation: Tests are not truly independent, making it difficult to pinpoint the exact cause of a failure. A failure in one test can cascade and cause subsequent, unrelated tests to fail, leading to misleading results and increased debugging time.

- Reduced Test Robustness: Using contain makes our tests less resilient to subtle changes in the application's UI or data. A test might pass even if the displayed value includes the expected substring but also contains unexpected or incorrect information. When a test using contain fails, the feedback provided is limited to a simple true or false. This makes it significantly harder to pinpoint the actual discrepancy between the expected and the current state. In contrast, more specific assertions like `have.text` often display both the expected and the actual value, drastically simplifying the debugging process and allowing developers to quickly identify the root cause of the failure.

## Decisions

-


## Consequences

-