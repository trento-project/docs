# 20. Checks Customization

Date: 2025-04-30

## Status

Accepted

## Context

Trento provides a catalog of checks with predefined expected values, often based on SUSE's best practices. However, specific customer environments may necessitate deviations from these defaults for certain checks to accurately reflect their operational reality or specific configurations.

Therefore, a mechanism is needed to 
- allow users to override the built-in expected values of specific checks for particular targets
- have these overrides used during check executions
- track changes in the activity log
- allow to opt-out from customizability for either entire checks or specific values within a check

## Considered Options

- **Storing Customizations in Web**
    *   places check-related data outside the Check Engine, making standalone engine usage clunky
    *   requires passing custom values for every execution, relieving wanda from customization state, yet complicating the execution request process (message contracts/API endpoints)
    *   managing consistency between check definitions (in Wanda) and customizations (in Web) becomes more complex, especially when check specifications change or checks are added/removed
    *   logging customizations is simple as the activity logging subsystem is embedded in web
- **Storing Customizations in Wanda**
    *   keeps check-related logic and data consolidated within the Check Engine
    *   allows for a more straightforward execution process, as Wanda can directly access its state for custom values
    *   managing consistency upon check specifications change or checks are added/removed is simpler because all the needed information is in the same place
    *   logging customizations needs the activity logging subsystem to be extended to support message based activities
    
Additional APIs and work to ensure that custom values are correctly applied during execution is needed in any case.

## Decision

We will introduce the checks customization capabilities to Wanda in order to 
- keep cohesive and consistent responsibility about check related actions and data
- keep execution process simple and straightforward also in a standalone engine usage
- allow for simpler management of check specifications changes and check additions/removals

### Checks Customizability
A check is deemed "customizable" if its definition includes a non-empty `values` section. 

Checks using hardcoded expectation values will need refactoring to use the `values` structure to become customizable. 

For enhanced flexibility, certain checks may be explicitly excluded from customization as well as specific values within a generally customizable check. It can be because of a strong policy about some values or because the nature of the check itself does not allow for customization.

This will be defined in the check specification via the following entry `customization_disabled: true`

### Operations
Wanda will expose API endpoints to manage custom values for a given check and target:
- retrieving the selectable checks for a given target. This will expose relevant check information in addition to the customization status
- applying, changing, or resetting custom values for a specific check and target

Notes:
- Wanda will need to enforce authorization for customization operations by checking abilities embedded within the JWT provided by Web, which currently is also the auth server
- the catalog endpoint remains unchanged. It will not expose the customization status of checks, although it will expose the customizability status of the check itself as it's defined in the specification

### Execution
During checks execution, Wanda will query its state for any custom values applicable to the check and the specific target being evaluated. 

If custom values exist, they will be used instead of the built-in values defined in the specification.

Additionally, the specific custom values used during a check execution must be snapshotted and stored alongside the execution results to ensure accurate reporting.

### Activity Logging
Customization actions are significant events and need to be logged in the central Activity Logging subsystem embedded in web. 

Since these actions are exposed by wanda we will have it expose relevant messages carrying also the information about the user performing the operations.

On the other hand the activity logging subsystem in web will be extended to support message based activities.

## Consequences

The depicted decision has the following effects:
- **Increased Flexibility:** users gain the ability to tailor check expectations to their specific environment needs, improving the relevance and accuracy of compliance results
- **Consolidated Logic:** keeping customization logic and data within Wanda aligns with its responsibility as the Check Engine
- **Simpler sync management**: check specifications changes and check additions/removals can be responded to in order to keep the customization data in sync
- **Enhanced Activity Logging**: the activity logging subsystem supports cross components actions logging
- **Enhanced Contracts**: messages will support the ability to carry the information about the user performing the operation, allowing for better tracking and auditing of actions taken within the system