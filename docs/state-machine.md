# State Machine

Generic states:

- `PENDING`
- `CHECKED`
- `CREATED`
- `CONFIRMED`
- `SETTLED`
- `CANCELLED`
- `FAILED`
- `REFUNDED`

Allowed transitions:

- `PENDING -> CHECKED`
- `CHECKED -> CREATED`
- `CREATED -> CONFIRMED`
- `CONFIRMED -> SETTLED`
- `CREATED -> CANCELLED`
- `CREATED -> FAILED`
- `CONFIRMED -> REFUNDED`

Use this model for application-level state. Provider-specific states should be
mapped at the provider package boundary.

`canTransition(from, to)` returns a boolean. `assertCanTransition(from, to)` and
`transitionPaymentState(from, to)` throw `InvalidStateTransitionError` for
invalid transitions.
