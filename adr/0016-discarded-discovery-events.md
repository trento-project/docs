# 16. Discarded Discovery Events

Date: 2024-10-15

## Status

Accepted

## Context

The discovery workflow allows Trento Agent instances to publish their host system's information to the Trento Web's `collect` API operation. Once accepted, the event results in one or more commands that are dispatched to the ES/CQRS system.

There are cases in which a discovery event sent from a Trento Agent is not processed; they can be grouped as:
1. The Trento Agent fails to connect to the Trento Web instance (network issues);
2. The Trento Agent fails to authenticate with the Trento Web instance (authentication issues);
3. The request payload is not in the expected shape, thus it cannot be mapped to a command (API contract issues);
4. The event is rejected because of the current data in Trento.

Given the `collect` API is an HTTP endpoint, publishing Trento Agents receive a response according to the result of the operation.

The discovery workflow is eventually consistent, as the dispatch operation completes without waiting for the command to be processed and read models to be updated. 

As Trento Agents publish discovery events periodically, regardless of whether their data changes, the Trento system tends to converge and gather all relevant data, even if some events are not ingested.

## Decision

Failures that depend on the current Trento data (4) are not reported as errors to the publishing Trento Agent; instead, it will receive a success status code indicating that the event has been correctly ingested by Trento Web, even if it won't be processed.

Such events, alongside the ones that fall into (3), are traced into the `discarded_discovery_events` database table for inspection and troubleshooting.

The decision of whether API contract issues (3) should be treated the same way, has been postponed.

## Consequences
* The separation of responsibilities between the publisher (Trento Agent) and the collector (Trento Web) is enforced: Trento Agent's job is done once the payload has been received and stored.
* The noise in the application logs of Trento Agents is reduced as there will be fewer entries that have little value for the host administrator.
* Users will have knowledge of the discarded event only by looking at the `discarded_discovery_events` database table.
