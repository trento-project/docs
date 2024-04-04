# 11. SAP system and database aggregate split

Date: 2024-04-04

## Status

Accepted

## Context

In the initial implementation of Trento, the SAP system and database states are stored in the same `sap_system.ex` aggregate. This is making the assumption that the relationship between a SAP system and a database is of 1 to 1, meaning that a database is only used by one SAP system. This is not an accurate description of the reality, as a database can handle multiple SAP systems in a multi-tenant environment.

In this scenario, when a multi-tenant database is discovered, it only can manage a unique SAP system and its application instances, making the multi-tenant scenario not supported.

This must be reverted, as a multi-tenant scenario is pretty common, and many deployments have them.

## Decision

The currently existing `sap_system.ex` aggregate will be separated in 2, creating a new `database.ex` aggregate that will handle databases individually. This way, the lifecycle of a database is extracted from the SAP system one, making them independent. Having this, a new 1 to N relationship will be created between the database and SAP system aggregates (read models being more precise). Now on, the SAP system ID will be calculated combining the database ID and its tenant name, creating a new and unique ID for each SAP system.

The relationship between database and SAP systems will continue existing in many senses, and most of the related events will be handled by event handlers. For example, when a database is deregistered, or its health updated, these events will be listened, and once they happen, they will affect the SAP system aggregate via commands. At the end, both aggregates continue being pure, and connected through this kind of mechanisms.

All of this forces us to handle previously existing events and aggregate roll-up snapshots, so most of the events related to a database will be upcasted. Besides this, some additional exceptions might arise, as SAP system and database don't share their ID anymore, but they did in the past, so previously stored data (as the deregistration process manager) must be taken into consideration.

In order to deal with all of these old events, besides upcasting, we have considered a couple of options when old events and IDs are mixed up. Initially, [prefixing](https://hexdocs.pm/commanded/Commanded.Commands.Router.html#module-define-aggregate-identity) the `sap_system.ex` aggregate routing it with a `sap-system-` prefix looked a good option. It removes the issues you could have when SAP system commands with old IDs now belonging to databases are dispatched, as they are routed with the prefix together with the ID. We have discarded this option, as it converts the SAP system stream different from the others, and hides a bit what's going on in these scenarios. Instead of this solution, as the unique real scenario when this can happen is when the `DeregisterApplicationInstance` is dispatched by the deregistration process manager, we will just handle this particular command. The command will be enriched in a middleware protocol, so commands with IDs now belonging to databases will be ignored.

## Consequences

The new database aggregate will make the handling of a multi-tenant scenario possible, as the relationship between a database and a SAP system becomes a 1 to N relationship. Besides this specific scenario, the code will represent a more precise view of the reality.

Once the already existing database and SAP systems events are upcasted, the application should continue working as it was before, and a unique tenant environment wouldn't have any difference compared with the old code structure.

Additionally, splitting the code makes it easier to read and understand, as the database logic is separated completely. Finding database related code will be much easier now on.