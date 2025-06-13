# 6. Use CloudEvents to describe event data

Date: 2022-11-17

## Status

Accepted

## Context

We need to define a common way to describe the data of the events that are exchanged between the components of Trento.
An envelope format is needed to carry the event payload and metadata and to easily serialize the data for the transport layer.
Ideally, we want to use a format that allows us to open the door for third-party components to easily integrate with Trento.

## Decision

Decided on [CloudEvents](https://cloudevents.io/).

## Consequences

The event data will be wrapped in a CloudEvent envelope.
The envelope will be completely opaque to the components, and the components will only interact with the event payload.
The envelope will be serialized for the transport layer.
A facade will be provided in the contracts packages to easily create CloudEvents from the internal data structures.
