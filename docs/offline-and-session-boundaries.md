# Offline And Session Boundaries

This document records the decisions made in Stage 5 of the Feature-Sliced
Design migration.

## Offline queue

`entities/offline-queue` owns the durable command schema and its repository
interface. Persisted data is wrapped in an explicit schema version and
validated when read. The old unversioned array representation and other invalid
data are discarded rather than replayed.

Replay is a deterministic model operation, independent of React. Commands are
processed in insertion order and stop at the first failure:

- a transport failure remains pending and may be retried;
- a server rejection remains visible as an error for user recovery;
- successful commands are removed individually, so partial progress survives;
- retry count, last-attempt time, and the last error are durable;
- temporary-to-server ID replacements are committed with command completion
  and survive reloads before dependent commands are replayed.

The React feature owns only scheduling, reachability checks, notifications, and
query invalidation. Moving durability from `localStorage` to IndexedDB will
require asynchronous repository hydration, but it will not require rewriting
the command schema or replay rules when the full offline working set is
implemented. Commands intentionally have no automatic expiry: unsynchronized
user work must never disappear merely because it is old.

## Authentication

Session state belongs to `entities/session`. `shared/api` knows only the
injected `HttpSession` interface and has no dependency on React, routing, or
login presentation.

Access tokens are held in memory and legacy persisted access tokens are
removed. Refresh tokens currently remain in `localStorage` because the backend
contract requires the raw token in the JSON body for refresh and logout.
Storage events invalidate the in-memory access token and propagate refresh
rotation or logout across tabs.

Persisting a refresh token exposes it to JavaScript and therefore to a
successful XSS attack. This is an explicitly accepted transitional tradeoff,
not the desired final design. Replacing it requires a coordinated backend
contract:

1. issue the refresh token as a `Secure`, `HttpOnly`, `SameSite` cookie;
2. rotate and revoke that cookie from refresh and logout endpoints;
3. enable credentialed requests only for the intended frontend origin;
4. keep the short-lived access token in memory;
5. define how an already-unlocked offline session is represented without
   making the refresh credential readable to JavaScript.

Until that backend change is delivered, frontend code must not copy refresh
tokens into any additional cache, query state, log, or offline record.
