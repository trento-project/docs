# 18. Agent operations orchestration

Date: 2025-01-28

## Status

Accepted

## Context

Follow up of ADR [17. Agent Operations Framework](https://github.com/trento-project/docs/blob/main/adr/0017-agent-operations-framework.md) which describes the actions to implement
write operations in Trento agents. In this case, this ADR describes the orchestration layer, which takes care of dispatching all the operation commands to the agents.

The framework must be able to orchestrate multi-agent and multi-step operations, as many operations are complex, including multiple clustered targets and actions that must be sequential in time.
It must be able of sending the operator actions to the agents and wait for the report. Once the report is received, decide to move on with the next operation steps or stop the operation as failed.

## Decisions

The operations framework orchestrator will be implemented in Wanda, as it already has direct connection to the agents using RabbitMQ. Likewise, it already includes some "must have" features like access to a persistent database, HTTP endpoints to expose stored information and additional code utilities which makes this feature easy to add.

We have chosen to use Elixir [Dynamic Supervisors](https://hexdocs.pm/elixir/1.13/DynamicSupervisor.html) to start and handle the operation requests dynamically. This means that the operations are short-lived processes responsible for handling individual operation requests. We already do the same with check executions with a successful outcome.

The process is able to:
- Decide which agent will receive the operation (from now on: target agents)
- Dispatch the individual operator requests to the target agents
- Wait for the reports and compute the overall step result after receiving the feedback from all the targets
- Move to the next operation step once the previous one is successfully completed
- Save the intermediate and final state of the operation as an historic record

At the end, all the orchestration is defined as a state machine that moves the current state through different stages.

### Operation

An operation is a multi-step process, where each step defines the operation to be executed in the agents. The steps are executed sequentially, but the step execution is requested in parallel to all involved agents. Besides this, it includes some additional metadata to describe the operation itself. Find here a dummy example:

```
%Wanda.Operations.Catalog.Operation{
    id: "testoperation@v1",
    name: "Test operation",
    description: """
    A test operation.
    """,
    required_args: ["arg"],
    steps: [
        %Wanda.Operations.Catalog.Step{
            name: "First step",
            operator: "operatior1@v1",
            predicate: "*"
        },
        %Wanda.Operations.Catalog.Step{
            name: "Second step",
            operator: "operatior2@v1",
            predicate: "isDC == true"
        }
    ]
}
```

As commented, the steps define the operator to be executed in the agents. Check the [Agent related ADR](https://github.com/trento-project/docs/blob/main/adr/0017-agent-operations-framework.md) for more information.
The `required_args` field defines the arguments that must be provided from the outside with a key/value format. For example: `saptune_solution=HANA`. They will be passed to the agent operators so they can be executed.

### Orchestration

The operations orchestration is composed only by 2 states:
- Dispatch the step operations to target agents
- Wait until all the target agents have reported back

This image represents the states and transitions:

```mermaid
  graph TD;
      A[Start operation]-->B{Steps left to run?};
      B--Yes-->C[Start operation step]-->H[Select target agents with predicate]
      H-->J[Dispatch step operation request to target agents];
      B--No-->D[Evaluate reports and finish];
      J-->K[Wait for target agent reports]-->E[Receive target agent report];
      E-->F{All target agents reported?}
      F--No-->K
      F--Yes-->G{Some target agent operation failed in step?}
      G--No-->B
      G--Yes-->D
```

### Predicate

Deciding if a step operation must be executed in some agents or not is something really useful. This will let us define some multi-agent operations where some step operations are only executed in certain agents. Some examples could be:
- Run cluster operations only in DC nodes
- Run SAP operations only in nodes with specific features, like ASCS or PAS nodes
- Exclude running operations in nodes like majority makers

The predicate will be a simple RHAI expression that returns a boolean. We will pass some agent specific values in the requests, so each agent has its own characteristics. With these values, we will run the RHAI evaluation in Wanda and decide if the operation step must be executed in this agent or not.

### Operations registry

The operations to be executed will be stored in a registry, in Wanda codebase. Unlike the checks executions, where the checks are implemented using YAML files and a specific DSL, in this case the operations will be hardcoded in the codebase, and there won't be any capability to upload them after releasing the code. We want to have control over want to implement, as the operations are really sensitive actions that could lead to malfunctions in the system if implemented incorrectly. The registry simply implements a basic map with some unique operation identifiers pointing to operations described in the [Operation](#operation) chapter.

### Out of scope in the first implementation

To make the delivery of this feature easier and faster, we have decided to let out some of the initial features we wanted to implement:
- Multi-step operations rollback. When the operation implements a lot of steps, returning to the original state in case of failure has some challenges as all intermediate steps must be rolled back in reverse other.
- Restart of operations with abnormal or unknown exit due the code crashes. We will "let it fail" by now, as in the majority of the cases, the error will be caused for things that will hardly be fixed in a subsequent execution. These can be things like: database access error, error publishing or reading from RabbitMQ, agent reporting an incorrect payload, internal state got corrupted, etc
Additional rationale about postponing this implementation is that the first few operations we will implement (saptune solution apply, cluster maintenance on/off, SAP application layer instance start/stop) won't harm the target agents if the operation is not resumed. If the operation request arrives to the agent, it will perform it in an atomic transactional change, so no matter what, the initial request done by the user will be effective. The worst thing that can happen is that the internal saved state of the operation might not match which what happened in the agent, but we are fine accepting this as an initial trade-off. As an effect, this makes the orchestrator not 100% reliable between what Wanda saved in its database and what happened in the target agents. Either way, once a we start implementing a multi-step rollback feature we will resume the task of implementing proper restarts.

## Consequences

Implementing the agent operations framework with this design enables us the following, so we can...:
- Implement multi-agent and multi-step operations
- Use a reliable self-implement Agent operators that we are sure they do exactly what we want and are tested
- Decide if the operation step is executed only in certain targets using a deterministic predicate
- Have a controlled and consistent operations registry
- Save all the executed operations and have a historical record
- In the future, rollback complex multi-step operations to the initial state