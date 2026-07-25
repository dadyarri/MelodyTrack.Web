# Browser Storage Policy

This is the storage standard for MelodyTrack Web. It distinguishes credentials,
preferences, recoverable user work, offline domain data, and application
assets. Those classes must not share one generic cache or lifecycle.

## Current Inventory

| Data | Current location | Current behavior | Main problem |
| --- | --- | --- | --- |
| Access token | Memory | Recreated through refresh after reload | Correct target |
| Refresh token | `localStorage`, `melodytrack.refreshToken` | Rotated by the HTTP interceptor and shared across tabs | JavaScript-readable credential; transitional until the backend supports an HttpOnly cookie |
| Saved portal clients | `localStorage`, `melodytrack.portalClients` | Stores up to eight names, timestamps, and portal link tokens | Persists a login capability in JavaScript-readable storage |
| Theme | `localStorage`, `melodytrack.theme` | Device-wide light/dark preference | Appropriate data class, but not expressed through a standard preference adapter |
| Create-form drafts | Five `draft:*:create` `localStorage` keys | Stores form values, replay key, and update time | Unversioned, unvalidated, unscoped by user, and never expires |
| Offline commands | `localStorage`, `melodytrack:offline-queue` | Versioned and validated; preserves retries, errors, ordering, and ID mappings | Synchronous, capacity-limited, and not partitioned by user |
| Reference labels | Six `melodytrack:reference-labels:*` `localStorage` keys | Accumulates ID-to-label maps | Unversioned, unbounded, stale, contains names, and is not partitioned by user |
| Generic HTTP responses | `localStorage`, `melodytrack:http-cache:*` | Caches unauthenticated GET responses by URL and query | Unversioned and unbounded; does not cache authenticated CRM data; can place portal tokens in storage keys |
| Chunk retry/navigation intent | Two `sessionStorage` keys | Survives one reload in the current tab and is then cleared | Appropriate data class |
| React Query data | Memory | Lost on reload | Correct for online-only data; insufficient for the future offline working set |
| Offline sync status | Memory | Recomputed from queue/connectivity activity | Correct target |
| App shell/assets | Browser HTTP cache only | Normal Vite asset loading | No service worker or explicit offline shell cache exists |
| IndexedDB | Not used | — | Required for durable, transactional offline domain data |

The generic HTTP cache currently excludes requests carrying an Authorization
header. It therefore is not an offline CRM cache. Its most notable eligible
request is the public portal-link status call, whose token can become part of a
`localStorage` key. It should be removed rather than expanded.

## Storage Selection

| Storage | Allowed use |
| --- | --- |
| Memory | Access tokens, transient UI state, sync activity, request deduplication, and ordinary React Query data |
| Secure HttpOnly cookie | Refresh credentials and future remembered-device portal credentials |
| `sessionStorage` | Small, non-sensitive, tab-scoped recovery markers that may disappear when the tab closes |
| `localStorage` | Small, non-sensitive device preferences only |
| IndexedDB | User-scoped drafts, offline commands, ID mappings, reference data, and persisted domain read models |
| Cache Storage through a service worker | Versioned application shell and immutable build assets only |
| Server database | Authoritative business records, credential/session state, audit history, and synchronization truth |

Web Storage, IndexedDB, and Cache Storage are not security boundaries. Any
JavaScript executing in the origin can access them. Moving data to IndexedDB
improves capacity, transactions, and structure; it does not make credentials
safe.

## Mandatory Rules

1. Application code must not call browser persistence APIs ad hoc. Each stored
   data class has one owning repository or adapter.
2. Business repositories belong to their entity or feature slice. `shared`
   may provide storage mechanics, codecs, clocks, and error types, but it must
   not own MelodyTrack business schemas or keys.
3. Every durable business record has:
   - an explicit schema version;
   - runtime validation at the read boundary;
   - a documented migration or explicit discard policy;
   - an owner/user partition where the data is user-specific;
   - `createdAtUtc` or `updatedAtUtc`;
   - a retention and cleanup rule.
4. Data from one user must never be displayed or replayed while another user
   is authenticated. Queue records and drafts must include the stable user ID,
   not an email or role label.
5. Credentials, password-reset codes, invite codes, recovery codes, portal
   link tokens, and raw Authorization headers must never be written to Web
   Storage, IndexedDB, Cache Storage, logs, query persistence, or storage keys.
6. Persistent cache keys must never contain secrets or raw URLs with sensitive
   query parameters.
7. Failed parsing must not produce partially trusted data. Invalid data is
   discarded or quarantined according to the repository policy and must never
   be replayed as a command.
8. Quota and write failures must be observable. Unsaved drafts or commands
   cannot be reported as saved locally.
9. Offline commands are never removed by age. They remain until synchronized
   or explicitly discarded by the owning user.
10. Logging out clears credentials, memory caches, and visible user state.
    Unsynchronized commands may remain only in a locked user partition; they
    must not become visible to or replay under a different account.

## Standard Durable Shape

Repositories may use separate IndexedDB columns instead of a JSON envelope,
but the logical fields are the same:

```ts
type PersistedRecord<T> = {
  schemaVersion: number;
  ownerUserId: string;
  createdAtUtc: string;
  updatedAtUtc: string;
  expiresAtUtc?: string;
  data: T;
};
```

Storage keys use `melodytrack:<owner>:<record>` and must not encode a schema
version or user identity into a secret-bearing string. IndexedDB primary keys
should use structured tuples such as `[ownerUserId, entityId]`.

## Retention

| Data | Retention |
| --- | --- |
| Theme and other non-sensitive preferences | Until explicitly reset |
| Tab recovery markers | Current tab only; clear immediately after recovery |
| Drafts | 30 days after the last edit, unless converted into a queued command |
| Offline commands | Until successful replay or explicit user-confirmed discard |
| Temporary-ID mappings | Until no queued command references them, with a bounded cleanup grace period |
| Reference data and labels | Domain freshness policy; revalidate online and purge records unused for 30 days |
| Persisted CRM read models | Domain-specific working-set window and freshness marker; never silently present stale data as current |
| Saved portal identity label | At most 180 days since use; no portal token |
| Refresh credential | Server-controlled session lifetime in an HttpOnly cookie |
| Static build assets | Current deployment plus one rollback-safe version |

## Target IndexedDB Layout

Use one database, `melodytrack`, upgraded through explicit database versions.
Initial object stores should be:

- `offlineCommands`
- `offlineIdMappings`
- `drafts`
- `referenceData`
- `readModels`
- `storageMetadata`

Writes that complete a command and create an ID mapping must use one
transaction. Database opening and migrations belong to shared storage
infrastructure; record schemas and repository behavior remain domain-owned.

## Logout And Account Switching

- Revoke the server session and remove the refresh cookie.
- Clear the in-memory access token and React Query state.
- Close active synchronization for the outgoing user.
- Keep pending commands only under that user's stable ID and mark the
  partition locked.
- Do not expose cached names, drafts, records, or queued changes after another
  account signs in.
- Provide an explicit “remove offline data from this device” action. If pending
  commands exist, require confirmation and explain that the action is
  destructive.

## Migration Priorities

### P0: Security And Data Isolation

1. Remove the generic `localStorage` HTTP cache and delete its existing key
   prefix.
2. Stop persisting portal link tokens. Replace quick portal login with a
   backend-issued, HttpOnly remembered-device credential; retain only
   non-secret display metadata locally.
3. Partition drafts, reference data, and offline commands by authenticated user
   before supporting account switching with pending local work.
4. Move the refresh token to a Secure, HttpOnly, SameSite cookie through a
   coordinated backend contract.

### P1: Offline Persistence

1. Introduce the versioned IndexedDB database and shared transaction/validation
   primitives.
2. Move commands and ID mappings first, preserving replay semantics.
3. Move drafts into their owning feature repositories with runtime schemas and
   expiry.
4. Replace label fragments and generic response caching with domain-owned
   reference/read-model repositories.
5. Add a service worker for a versioned app shell and immutable build assets.

### P2: Operations

1. Add storage usage/quota diagnostics.
2. Add user-facing offline-data inspection and removal.
3. Add migration, quota failure, account isolation, logout, and deployment
   upgrade tests.
