|              |                                                      |
| :----------- | :--------------------------------------------------- |
| Feature Name | Checks Customization                                 |
| Start Date   | Jan 15th, 2025                                       |
| Category     | Architecture                                         |

# Summary

Certain checks in the Trento checks catalog should be customized by customers on a target basis to adjust the corresponding expected values to ones that work better in their environment.

### Use Cases outline

- As a user, I want to override a Check's expected values on a target basis (host or cluster at the moment) so that it matches my specific environment needs
- As a user, I want the overridden values to be used in a checks execution
- As a user, I want to reset a customized check to default so that I can return to using SUSE's suggested best practices
- As a user, I want check customization attempts to be tracked in the Activity Log

# Motivation

The purpose of this RFC is to define what Checks customization entails in overall Trento Architecture:
- where data and operations belong
- the interactions involved between the components (mainly server and checks engine)
- authorizing customization operations
- tracking customization activities

# Detailed design

Considering the outlined [use cases](#use-cases-outline) we need to:
- define [when a check can be customized](#customizable-check)
- persist custom values (basically CRUD-ish operations) on a check+target basis
- use custom values in the checks execution by the Check Engine (Wanda)

Since check engine is meant to deal with Checks, it looks naturally reasonable considering it as the component who's responsible to deal with [custom values operations and data](#operations-on-custom-values).

This makes sure also that [during checks execution](#custom-values-usage-during-checks-execution) the engine already has the information needed to override built-in values.

## Customizable check

A Check can be considered *customizable*, meaning a customer is allowed to modify its expected values, if it's specification contains the `values` entry and if that entry is not empty.

**Customizable Check excerpt**
```yaml
id: "156F64"
name: Check Corosync token_timeout value
# ...
values:
  - name: expected_token_timeout
    default: 5000
    conditions:
      - value: 30000
        when: env.provider == "azure" || env.provider == "aws"
      - value: 20000
        when: env.provider == "gcp"
```

In order to allow customization of checks where hardcoded values are used in expectation rhai scripts, those checks need to be adjusted by moving hardcoded values to DSL specified values.

**Not Customizable Check excerpt**
```yaml
# not customizable check
id: "AAA000"
name: Lorem ipsum dolor sit amet
# ...
# missing `values` entry
expectations:
  - name: foo_expectation
    expect: facts.some_fact == "yes"
```

Need to be refactored to something like the following
```yaml
# refactored to be customizable
id: "AAA000"
name: Lorem ipsum dolor sit amet
# ...
values:
  - name: expected_yes_value
    default: "yes"

expectations:
  - name: foo_expectation
    expect: facts.some_fact == values.expected_yes_value
```

This is necessary because operating on the rhai script is currently not an option.

### Caveats

After some deeper research there are some caveates to be take into account for check customizability
- check [3A59DC](https://github.com/trento-project/checks/blob/main/checks/3A59DC.yaml) will be not allowed for customization because of its nature (what it is attempting to do and how it is written)
- if one of the values of a check is a list, that specific value won't be allowed for modification (deferred implementation)

## Operations on custom values

In order to support applying custom values, changing them after they've been set and also reset to SUSE's default ones, the following new operations would be introduced:
- [Apply custom values](#apply-custom-values)
- [Change custom values](#change-custom-values)
- [Reset custom values](#reset-check-to-defaults)
- [Reading custom values](#reading-customization)

**Disclaimer:** all following endpoints, methods, paths, query strings, parameters are indicative at this point and up for further refinement.
The intent is to give the general feeling of the moving parts and what is needed.

### Apply custom values
This operation allows to apply custom values for a given customizable check that has not been customized yet.
The operation allows to apply a custom value for at least one customizable value, meaning that if a check defines more than one **expected value**, this operation allows to customize one, many or all of them (ie. if a check has 3 expected values defined, a user might be interested in customizing only one of them and use the default ones for the others)

#### Endpoint

`POST /checks/:check_id/values`
```json
{
    "target_id": "target-uuid",
    "group_id": "group-uuid",
    "values": [
        {
            "name": "expected_token_timeout",
            "value": 42
        },
        // possibly other entries
    ]
}
```

### Change custom values
This operation allows to change custom values on an already customized check.
The operation allows to change custom values for at least one customizable value, meaning that if a check defines more than one **expected value**, this operation allows to change customization for one, many or all of them, independently from the fact that they've been previously customized or not (ie. if a check has 3 expected values defined, and a user has customized one of them, with this operation a user might be interested in customizing only one of them and use the default ones for the others)

#### Endpoint

`PATCH /checks/:check_id/values`
```json
{
    "target_id": "target-uuid",
    "group_id": "group-uuid",
    "values": [
        {
            "name": "expected_token_timeout",
            "value": 42
        },
        // possibly other entries
    ]
}
```

### Reset check to defaults
This operation clears any previously set custom value, effectively resulting in checks execution considering built-in values defined in check's specification.

#### Endpoint

`DELETE /checks/:check_id/values`
```json
{
    "target_id": "target-uuid",
    "group_id": "group-uuid"
}
```

Whether such operations require both `target_id` and `group_id` as input for the operations will be defined at due time.

### Reading customization

A target's checks selection workflow gets extended with customization capabilities, hence the following extra information is needed:
- whether a check is customizable
- whether a value of a customizable check can be customized (ie a value which is a list cannot be customized, yet)
- identify which is the value being used based on the context (requires evaluating `when` conditions) so that the user know what actually is going to be overridden
- whether a check has been already customized
- which are the custom values that have been applied

Since reading the checks catalog alone wouldn't be enough anymore, options are:
- the current read operation on the catalog is extended to carry the customization data
- a read operation is added specifically targeting custom values
- a read operation is added to fulfill the overall Checks Selection (meaning the read catalog operation remains as such while an *extended catalog* representation, as depicted in the first option, becomes an operation on its own)

#### Option 1: enriching the catalog

This option, besides requiring the addition of extra field to the catalog's representation, also demands for the target identifier, at least, to be part of the operation input so that the correct overriding values are retrieved.

`GET /checks/catalog?provider=...&target_type=...&target_id=uuid`

Sample response would be what the catalog currently exposes plus the extra information
```json
[
  {
    "id": "check1",
    // other check fields
    "values": [
      //...
    ],
    "customizable": true,
    "customized": true,
    "custom_values": [
      //...
    ]
  },
  // other checks
]

// Note: customization related new fields could be grouped into their own entry, rather than adding all of them at the root level
```

This option adds perhaps too much responsibilities to the catalog operation which is also used when non in a checks selection workflow.

#### Option 2: exposing a read operation for target based customized values of a check

This option entails the introduction of a new operation to get all customized values information for a specific target. Better not do it on a per check basis as we usually need info for a bulck of checks.

`GET /checks/:target_id/values`
```json
[
  {
    "id": "check1",
    "default_values": [
      //...
    ],
    "custom_values": [ // having both original ones + overriding ones allows exposing the difference
      //...
    ]
  },
  // other checks customized values
]
```

Such an options requires to delegate to a client aggregating information from the catalog and this new data to get the full picture.

#### Option 3: exposing a read operation for target based catalog with customization information

This option proposes a new operation which effectively is a narrowed version of the catalog specific for the target containing also customization information, as in option 1, keeping the actual catalog operation untouched and scoped only for generic consultation.

`GET /checks/:target_id/catalog?qs...`
```json
[
  {
    "id": "check1",
    // other check fields
    "values": [
      //...
    ],
    "customizable": true,
    "customized": true,
    "custom_values": [ // having both original ones + overriding ones allows exposing the difference
      //...
    ]
  },
  {
    "id": "check2",
    "values": [
        //...
    ],
    "customizable": true,
    "customized": false,
    "custom_values": [] // empty list | null | absent
  },
  {
    "id": "check3",
    // missing or empty values entry
    "customizable": false,
    "customized": false,
    "custom_values": [] // empty list | null | absent
  }
]

// Notes:
// - delegating detection of whether a check is customizable (ie it has values) to a client sounds like logic leakage
// - delegating detection of whether a check is customized (ie it has custom values) to a client sounds less of a leakage but if we decide to expose `customizable` it is just trivial exposing also a `customized` entry
```

Somewhat related to [this hackweek exploration](https://github.com/trento-project/web/pull/3160).

## Custom values usage during checks execution

When there are custom values for a check on a specific target, those need to be used instead of the built-in ones during a [checks execution](https://github.com/trento-project/wanda/blob/main/guides/specification.md#checks-execution).

By having the custom values available in its state, wanda can simply query and use them instead of the built-in ones.

### Notes on execution results

Since custom values at a certain point in time might differ from custom values used during an execution it becomes necessary snapshotting the specific custom values used during a specific execution, that is storing the custom values along with the execution result they're being used in.

Then, to get a proper overview of a checks execution results, data from the catalog and from the extended checks execution results keep being aggregated together as we already do.

## Authorizing and Logging customization activities

### Authorization

Currently Wanda only supports checking for an authenticated token, it does not check whether user is authorized to perform an action.

We can make sure that the JWT generated by the auth server (aka web) also contains abilities, so that a service provider (like wanda in this case) can allow/disallow certain operations.

### Logging

Currently, [Activity Logging](https://github.com/trento-project/docs/blob/main/adr/0015-activity-logging.md) is pretty much scoped to server component tracking activities of the following nature:
- API based operations, that is calls to specific http requests
- domain events emitted by the system

Having checks customization operations in wanda adds a challenge since those interesting actions are not passing through the Activity Logging subsystem.

Options available to get a valuable outcome are:
- checks customization operations are proxied via server component (meaning we have twin operations exposed by trento web that actually just call wanda)
- wanda emits messages after it applies customization so that interested parties - web - acknowledges the operation was successfully completed and tracks relevant entries in the activity log

Activity Logging needs to evolve to support logging actions in a distributed system like Trento, however this is out of scope for this specific RFC.

# Drawbacks

# Alternatives

The main alternative point is storing custom values in Web rather than in Wanda.

Generally speaking all the considerations made previously keep their validity.

Here's the main points considered about storing custom values in web:
- having web responsible for checks customization data and operations means leaking a responsibility where it does not naturally belong
- in the context of a standalone Compliance Check Engine, Checks Customization feature would be clunky to use because custom values would not be organically part of the check engine, but would need to be provided every time even if they did not change
- using the overriding values in a checks execution requires sending those from web to wanda via the `ExecutionRequested` message hence either:
  - we change the message contract
  - we inappropriately send the overriding values in `ExecutionRequested` env entry
- also the start endpoint in Wanda needs to be changed
- having checks and their customization in different places makes it harder to operate when checks change (meaning that if a check changes its spec we need to react to that and possibly invalidate a previously made customization for instance. We have a similar situation with selected checks stored in web and the possibility that a selected check is removed)

# Unresolved questions

- consider the difference between customizing checks for a host vs customizing checks for a cluster (host checks execution vs cluster checks execution) target_id might not be sufficient, we might need to take into account the group id as well