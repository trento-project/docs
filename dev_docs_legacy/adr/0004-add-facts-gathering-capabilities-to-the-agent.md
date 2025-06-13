# 4. Add facts-gathering capabilities to the agent

Date: 2022-11-17

## Status

Accepted

## Context

We want to gather facts from the target infrastructure, to be able to use them in the expectations section of the checks or for other purposes.
A "gatherer" is a piece of code that knows how to extract a specific fact from a host.
We need to implement a way to run the gatherers and collect the facts, namely the "gathering engine".
Also, advanced users might want to develop custom gatherers, we can refer to them as "gatherers plugins".

## Decision

The agent should be able to gather facts from the hosts and send them to the server.
A request is sent from the server to the agent to gather facts, the agent runs the gatherers and sends the facts to the server.
The communication between the agent and the server is asynchronously done via AMQP.
If the agent is not able to gather one or more facts, it should send a message to the server with the list of the failed gatherers alongside the successfully gathered facts, in a best-effort fashion.

## Consequences

By moving the facts-gathering capabilities from the runner to the agent, we provide a clear separation of concerns.
The agent is agnostic of the checks and the evaluation of the expectations. This reduces the complexity of the runner, gives clear responsibilities to the components, and removes the need for an SSH connection from the runner to the hosts.
Also by introducing the concept of gatherers, we limit the execution of arbitrary code on the hosts, by providing a well-defined set of actions that the agent can perform.
A specific gatherer is executed just once for each gathering request, this reduces the load on the hosts and the network.
Gatherers could be used in the future for other purposes than the evaluation of the expectations, for example, to generate a report of the infrastructure, or in place of the current discovery mechanism.
