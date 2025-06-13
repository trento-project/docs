# 14. Decoupling of Trento checks from Wanda

Date: 2024-08-06

## Status

Accepted

## Context

Trento includes a component called Wanda that is responsible for performing various configuration checks on the system.

Currently, the configuration checks used by Trento are bundled with the Wanda component, which means that any updates to the checks require a full update of the Trento product. This can lead to delays in users receiving the latest checks, as they have to wait for a new Trento release.

## Decision

We have decided to modify the Trento architecture to read the configuration checks from a directory on the filesystem instead of bundling them with the Wanda component. This will allow the checks to be updated independently of the core Trento system, enabling users to consume check updates faster.

On traditional setups the checks will be shipped through an RPM package. On Kubernetes-based setups (and generally setups that leverage containers) the checks will be shipped through a container image that will be instantiated as a sidecar container: the sidecar container itself will copy the checks onto a shared volume from which Wanda will be able to read them.

## Consequences

- Users will be able to receive updates to the configuration checks more quickly, without waiting for a full Trento release.
- The development and maintenance of the checks can be decoupled from the core Trento system.
- Users (as in system administrators) will be able to write their own checks and load them into Trento.

## Alternatives Considered

- Continue Bundling Checks with Wanda: This would maintain the current architecture, but would not address the issue of delays in users receiving check updates.
- Ship the checks as an OCI artifact directly downloaded by Wanda using an embedded OCI client library: this would lead to additional complexity in Wanda's codebase. It's feasible, but the team decided for a lower cost solution for the moment to address this need. The cost of this additional complexity would have been way bigger than the return.

