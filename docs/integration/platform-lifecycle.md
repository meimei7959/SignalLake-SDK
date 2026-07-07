# Platform Lifecycle Mapping

## Shared Events

| Platform Signal | SignalLake Event | Category | Notes |
| --- | --- | --- | --- |
| App/process ready | `app.opened` | lifecycle | Emit after primary UI/runtime is ready. |
| App foregrounded | `session.started` | lifecycle | Optional when platform distinguishes sessions. |
| App backgrounded/closed | `session.ended` | lifecycle | Optional for dry-run skeletons. |
| Screen/route visible | `screen.viewed` | screen | Use stable semantic screen ids. |
| User command | `command.invoked` | command | Use stable command ids. |
| Handled error | `error.occurred` | error | Use stable non-sensitive error codes. |

## Rust Desktop

- App window ready -> `app.opened`
- Route/view switch -> `screen.viewed`
- Menu/shortcut/backend command -> `command.invoked`

## Android

- Activity `onStart` after SDK init -> `app.opened`
- Fragment/screen visible -> `screen.viewed`
- Button/menu/shortcut semantic action -> `command.invoked`

## Android TV

- Use `SignalLakeQueuePolicy.androidTvDefault()`.
- Prefer smaller batches and reject or drop diagnostic events before behavioral events.
- Never collect receiver names, local network identifiers, media titles, URLs, or filenames.

## iOS

- Scene activation after SDK init -> `app.opened`
- View/screen visible -> `screen.viewed`
- Button/menu/shortcut semantic action -> `command.invoked`

## Privacy Rule

Platform adapters must not add fields blocked by `schemas/privacy-rules.v1.json`.

## Encryption Rule

Platform adapters must encrypt every drained `signallake.event-batch.v1` before
upload. Relay upload accepts only `signallake.encrypted-event-batch.v1`; plaintext
batches are client-internal and must not cross the client boundary.
