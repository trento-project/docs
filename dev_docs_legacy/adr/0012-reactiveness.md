# 12. Reactiveness

Date: 2024-04-24

## Status

Accepted

## Context

A strong selling point of Trento is its reactiveness as we mention in the [main project's README](https://github.com/trento-project/web?tab=readme-ov-file#reactive-control-plane).

> By leveraging modern approaches to software architecture and engineering and top-notch technologies, we built a reactive system that provides real-time feedback about the changes in the target infrastructure.

While this is the underlying nature of the system and how it gets presented to users, it is also true that not every part of the system might have the strong need to be reactive.

## Decision

As a general rule of thumb, we decide to make reactiveness of certain sections of the system a first class citizen when that section is meant to be used or will very likely be used in [Kiosk mode](https://en.wikipedia.org/wiki/Kiosk_software).

## Consequences

Not every part of the system will need full blown reactiveness, so implementation and maintenance is simplified where possible.

Examples of not totally reactive sections could be:
- `Checks Catalog` (ie its content is not expected, at least currently, to change real-time based on new checks made available on wanda)
- `Settings` (ie a user operating in the settings, is not expected to see changes made by another user in real time)

Examples of sections where reactiveness is necessary:
- `Dashboard`
- `Overviews` (_Hosts_, _Clusters_, _SAP Systems_, _HANA Databases_)
- `Details` (_Host Details_, _Cluster Details_, _SAP System Details_, _HANA Database Details_)

In any case, actions having effects on parts of the system where reactiveness is desired still need to keep supporting the desired behavior, regardless of the generating point of the action.