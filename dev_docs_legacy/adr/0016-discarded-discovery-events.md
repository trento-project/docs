# 16. Discarded Discovery Events

Date: 2024-10-15

## Status

Accepted

## Context

The discovery workflow allows Trento Agent instances to publish their host system's information to the Trento Web's `collect` API operation. Once accepted, the event results in one or more commands that are dispatched to the ES/CQRS system.
Responsibilities are separated between the publisher (Trento Agent) and the collector (Trento Web): Trento Agent's job is done once the payload has been received and stored.

There are cases in which a discovery sent from a Trento Agent is not processed; they can be categorized as:
1. The Trento Agent fails to connect to the Trento Web instance (network issues);
2. The Trento Agent fails to authenticate with the Trento Web instance (authentication issues);
3. The request payload does not match the expected shape, thus it cannot be mapped to a command (API contract issues);
4. The discovery is rejected because of the current state in Trento.

Currently all these scenarios result in an error being returned by the `collect` endpoint and subsequent log in trento agent.

## Decision

Failures that depend on the current Trento data (4) are not reported as errors to the publishing Trento Agent; instead, it will receive a success status code indicating that the event has been correctly ingested by Trento Web, even if it won't be processed.
This is legitimated by the periodicity of the discoveries that would lead Trento to eventually converge to a consistent state.

Such events, alongside the ones that fall into (3), are traced into the `discarded_discovery_events` database table for inspection and troubleshooting.

The decision of whether API contract issues (3) should be treated the same way, has been postponed.

## Consequences
* The noise in the application logs of Trento Agents is reduced as there will be fewer entries that have little value for the host administrator.
* Users will have knowledge of the discarded event only by looking at the `discarded_discovery_events` database table.
