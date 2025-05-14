# 13. Tracking Software updates discovery results

Date: 2024-05-07

## Status

Accepted

## Context

Trento features currently building on top of [SUSE Manager](https://www.suse.com/products/suse-manager/) (**SUMA** from here onwards) integration mainly consist in:
- running software updates discoveries
- exposing relevant patches and upgradable packages

At the moment there is no known reactiveness in SUMA allowing Trento to be notified about state changes, so Trento proactively triggers software updates discoveries at relevant moments (ie Host registration, change in SUMA settings, in a scheduled fashion), potentially changing host health.

Information used to determine a discovery outcome is the result of several requests to SUMA and is the same data useful to be exposed as relevant patches and upgradable packages.

At discovery time SUMA is always queried directly in order to get a fresh representation of its state, however since the same kind information retrieved during discovery is what at the end has to be exposed as relevant patches and upgradable packages, we need to decide how the exposing side of the integration is treated.

## Considered Options

- **Proxied Results Retrieval**: Retrieval of software updates is proxied to SUMA
- **Tracking Software Updates Discovery results**: Software updates discovery results are tracked in Trento at discovery time and exposed via API

## Decision

At the time of writing the following was taken into account as a driver for the integration

> *Trento must be consistent with itself*: ie if there are patches affecting a hosts's health, Trento must provide a consistent information from different application sections, even if it means being out of sync with the actual state in SUMA

As mentioned, software updates discovery results is what we rely on in order to changing the host's health, and is also the relevant information to be exposed by Trento.
Retrieving this information from SUMA in a proxied fashion does not support required consistency within Trento, because the information gotten at discovery time (the one affecting host's health) may differ from the one retrieved later.

For this reasons we decided to: 
> track software updates discovery results at discovery time and expose the tracked results via Trento API

## Consequences

The depicted decision has the following effects

- we keep consistency within Trento as what is tracked at discovery time is also what is exposed as hosts' available software updates 
- we achieve a higher degree of decoupling from SUMA by having Trento API deal with tracked software updates results
- we avoid introducing side effects in read operations
- we limit the amount of potentially unnecessary requests to SUMA
- relevant patches and upgradable packages overviews also benefit, by relying on the same data tracked at discovery time