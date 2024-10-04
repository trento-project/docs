# 15. Activity Logging

Date: 2024-10-02

## Status

Accepted

## Context

Trento feature-set is growing and not limited to only reading operations but expanding to applying state changes of different natures.

Such activities may be of huge impact and visibility on them is a great asset to troubleshooting incidents, determining root causes of issues and it improving transparency of the system in general.

Additionally the possibility to correlate actions/events in order to build a history carrying cause-effects links, enhances visibility by supporting a sense making about chain of events and their outcomes.

With this in mind logging activities and their cause-effect relationship becomes a much valuable feature for Trento users.

## Considered Options
- **Change Data Capture/Write ahead Log (CDC/WAL)**: listen to the Postgres streaming replication log for certain tables, and do something when a relevant db operation happens
- **[Open Telemetry](https://opentelemetry.io/) integration**: leverage OTEL libraries for automatic data collection and a [third party search engine](https://github.com/quickwit-oss/quickwit) for searching on collected data
- **Nimble bespoke instrumentation**: instrumenting the code to capture only what of interest and appending entries into a new local postgres table

## Decision

A CDC/WAL approach requires by definition that the relevant activities hit the database with a *write*, however that is not the case for all the possibly interesting activities (ie. a login attempt, requesting checks execution), hence this is not a viable option unless we introduce changes forcing such database writes to happen.

Integration of OTEL and its almost automatic instrumentation turned out to be quite convenient with regards to data collection, however it demands the introduction of a third party tool to enable searching capabilities on collected data.
The overhead the introduction of this extra piece of software adds to the release process led us to deciding not to pursue this approach.

For this reasons we decided to implement a bespoke yet nimble mechanism to log relevant activities into a dedicated table in the already present postgres instance.

Currently, interesting loggable activities are:
- cartain http requests made to relevant trento's APIs
- all domain events emitted by the system

and we will use specific mechanism to capture them with regards to their nature
- a plug/middleware will forward all http requests to an activity logger that will decide whether to log something or not
- an event listener will listen to all emitted events and delegate to an activity logger appending the log entry to the persistence layer

## Consequences

The depicted decision has the following effects:
- the footprint of the feature rollout is kept at minimum. No extra deps are needed
- changes to already existent modules/code is near to zero
- we can leverage postgres searching capabilities

Tradeoffs:
- writes to the database are doubled for relevant activities
- the size of the activity log table depends on the number of logged activities combined with the retention time set by the user