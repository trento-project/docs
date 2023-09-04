# 10. Web repository directory structure and contexts

Date: 2023-08-24

## Status

Proposal

## Context

The web dashboard repository, is a `phoenix` application. Right now the directory structure and the overall `phoenix` framework convention regarding modules and code organization are not respected.
With the increasing complexity of the project and the codebase, we need to switch to the `phoenix` framework standards, to be compatible with code generators and framework conventions in general.

The current directory structure is too complex in a lot of aspects, given the fact that it's really difficult to follow where the moving parts are and deciding where to put them, which is becoming even more difficult with the increasing codebase complexity.

The web project is also a `commanded` application. `commanded` has examples and guidelines on how to structure the projects, the directories and the modules. This documentation with the official  `phoenix` guide will be the base principles for this refactoring.
As software engineers, we propose a new structure/architecture to increase developers' productivity, confidence, and obtain adherence to framework/language standards.

As a side effect, we will align Wanda and Web to the same standard, decreasing onboarding length.

REF

- https://hexdocs.pm/phoenix/contexts.html
- https://github.com/slashdotdash/segment-challenge/tree/master/lib/segment_challenge/challenges
- https://github.com/slashdotdash/segment-challenge/tree/master/lib/segment_challenge/athletes
- https://github.com/slashdotdash/segment-challenge/tree/master/lib/segment_challenge/infrastructure
- https://github.com/slashdotdash/segment-challenge/tree/master/lib/segment_challenge/stages

## Decision

We propose a directory structure with these characteristics

- One context for each "domain entity" of our application (clusters, sap_systems, hosts, tags etc..)
- Everything that is tailored to the context in the same directory, (policies, services, etc..)
- "integration"/"infrastructure" context, containing all the interaction outside the domain like rabbitmq, checks engines etc.. (what we have now in application directory) and commanded cross-aggregate interactions


**Example with sap_system context**

```
lib
    trento
        sap_system
            commands
            events
            projections // projectors + readmodels
            queries // custom queries
            services // like the health service
            sap_system.ex // the aggregate
            // all other domain entities
        sap_system.ex // the context "entrypoint" the "usecase"
```

**Example of integration context**

```
lib
    trento
        integration
            commanded
                event_handlers
                process_managers
            checks
            discovery
            grafana
            prometheus
            telemetry
            auth
```


The `trento_web` directory should contain all the files and contexts dictated by the `phoenix` guide, including mailer and mail templates. 

The module names should be refactored to reflect the directory structure. This means that we will need an ecto migration, to change module names in the commanded persistence, to maintain compatibility between old/new installations

## Consequences

The new directory structure will make easier for current engineers and new hires, to navigate the codebase and get familiar with it, searching for support documentation will be easier due to the respected community standards.

The phoenix generators will work without manual intervention and future phoenix updates will be easier, due to the already standard directory structure. Following the upgrade guide, without translating the structure to our custom directory structure, will be a sufficient step.
