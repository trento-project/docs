# 19. E2E Testing Practices & Page Object Implementation

Date: 2025-04-25

## Status: 

Accepted

## Context

This document outlines the identified challenges within our current Cypress End-to-End (E2E) test suite and the strategic decisions made to address these issues. The goal is to improve the maintainability, readability, robustness, and overall efficiency of our E2E testing efforts.

Our existing E2E test suite, while providing valuable coverage, suffers from several key limitations:

- Significant Code Duplication: Repetitive code across test files and scenarios complicates maintenance and increases the test suite size.
- Lack of Test Organization and Readability: The absence of a clear organizational structure and natural language-based naming conventions makes it difficult for team members to understand the test suite's scope and purpose.
Limited Code Reusability: Inefficient reuse of test logic, helper functions, and interaction patterns contributes to code duplication and increases test creation effort.
- Suboptimal Element Interaction: Over-reliance on generic Cypress utilities for element selection can lead to less resilient and harder-to-understand selectors.
- Absence of Page Object Model (POM): Embedding UI interaction logic directly within test files tightly couples tests to the UI, reducing maintainability and readability, and hindering the isolation of UI interactions and business logic.
- Reduced Test Isolation: Lack of true test independence makes debugging challenging as failures can cascade and produce misleading results.
- Reduced Test Robustness: Using `contains` assertions can lead to false positives and provides limited debugging information upon failure, making it harder to pinpoint the actual issue.

## Decisions
To overcome these challenges, we have decided to implement the following strategies:

- Adoption of the Page Object Model (POM): We will implement the POM to encapsulate all UI interaction logic and data within dedicated page object modules. Test files will then utilize concise, descriptive methods from these page objects, focusing solely on the test steps.
This implementation will use Java modules (instead of classes) as distinct object instances are not required. Each module will represent a specific application page. Common utility methods will reside in a base page object module, accessible to all other page-specific modules through import/export.
- Implementation of Custom Selectors: We will prioritize the development of custom, robust selectors over exclusive reliance on Cypress's built-in tools. This will lead to more resilient and readable test methods, often reducing the need for complex DOM traversal within the tests.
- Ensuring Test Isolation: Each test scenario will be provided with the necessary pre-conditions to ensure its independence. This will prevent failures in one test from affecting others, significantly simplifying the debugging process.

- Utilizing Precise Assertions: We will favor specific assertions (when possible) like `have.text` over more general ones like `contains`. These precise assertions provide detailed feedback (expected vs. actual values) in failure logs, enabling faster and more accurate identification of the root cause.

## Consequences
The implementation of these decisions is expected to yield the following benefits:

- Improved Maintainability: Reduced code duplication and a well-defined structure will make the test suite easier to update and manage.
- Enhanced Readability: Clear separation of concerns and descriptive test methods will improve the understandability of the tests for all team members.
- Increased Reusability: The POM and custom selectors will promote the reuse of code components, saving development time and effort.
- Greater Robustness: More specific selectors and assertion strategies will make the tests less susceptible to minor UI changes and provide more accurate feedback.
- Simplified Debugging: Test isolation will significantly streamline the process of identifying and resolving test failures.