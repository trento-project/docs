# 2. Build a DSL to declare checks

Date: 2022-07-27

## Status

Accepted

## Context

We want to build a Domain Specific Language to declare checks, superseding the current architecture which is based on Ansible.
The need this DSL aims to fulfill is to provide users a simple way to declare what we (the Trento Core Team) often refer to as "checks".
Checks are, in Trento's domain, the crystallization of SUSE's best practices when it comes to SAP clusters configuration in a form that both a man and a machine can read.

## Decision

We will declare checks by using a YAML file with three main sections.
The "metadata" section will contain the id, name, description and other relevant information.
The "facts" section will declare which facts should be extracted from the hosts.
The "expectations" section will declare the assertions that need to be true for the check to pass.

## Consequences

By rolling our DSL, we can describe checks in a declarative way.
We get several benefits from this approach:

- Humans can formalize best practices with no space for ambiguity;
- Machines can assert systems' states, automatically, with no space for ambiguity;
- The development of new best practices gets streamlined through a common definition that allows to bootstrap shared efforts;
- The custom YAML will improve the DX, by superseding Ansible playbooks which are not tailored around checks execution;
- Linting and validation tools can be provided and added to the CI.

