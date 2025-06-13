# 3. Build a check execution orchestrator

Date: 2022-11-17

## Status

Accepted

## Context

We need to orchestrate the execution of the checks, namely the "facts-gathering" and the "expectations evaluation" steps.
As we moved the facts-gathering capabilities from the runner to the agent, we need to implement a way to orchestrate facts-gathering processes and evaluations of the expectations defined by the DSL.

## Decision

We decided to create a new service, which will supersede the current runner and will be responsible for the orchestration of the execution of the check.
The service will be able to collect the facts from the agents and evaluate the expectations of the checks by using a scripting language.
Once every fact is collected and every expectation is evaluated, the service will send a message to the server with the results of the execution, in a best-effort fashion.
An execution is completed when all the checks are evaluated, and the results are sent as a message to the other components, with detailed information about the execution, such as evaluation results, facts gathered, and so on.
The executions will be stored in the database and will be exposed via an API to the consumers.

## Consequences

The runner will be superseded by a new service, which will be responsible for the orchestration of the execution of the checks.
The dashboard will be able to consume the results of the execution via the API and will be able to display the results of the checks.
The responsibility of the dashboard will be limited to the presentation of the results of the checks, and the orchestration of the execution will be delegated to the new service,
simplifying the cluster aggregate and reducing the number of events stored in the Event Store.
The UX in the dashboard will be improved, as the results of the checks are not limited to an "OK" or "KO" status, but can be more detailed and can include the results of facts and expectations.
