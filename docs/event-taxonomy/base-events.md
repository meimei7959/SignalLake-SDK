# SignalLake Base Events

## Purpose

Define the shared event language for product manifests. Products may add domain events, but they should reuse these base event names where possible.

## Naming

- Use dotted lowercase names: `category.action`.
- Keep names semantic, not UI-element-specific.
- Do not include product, route, filename, user text, URL, or device personal name in the event name.
- Put stable details in properties after privacy review.
- Reuse common fields from `docs/event-taxonomy/common-fields.md` before adding product fields.

## Base Events

| Event | Category | Privacy | Meaning |
| --- | --- | --- | --- |
| `app.opened` | lifecycle | behavioral | App opened and primary UI/runtime is ready. |
| `app.closed` | lifecycle | behavioral | App exits or primary runtime closes. |
| `session.started` | lifecycle | behavioral | A logical user session starts. |
| `session.ended` | lifecycle | behavioral | A logical user session ends. |
| `screen.viewed` | screen | behavioral | User views a stable screen or route. |
| `command.invoked` | command | behavioral | User invokes a semantic command. |
| `error.occurred` | error | diagnostic | A handled error is recorded with a stable code. |
| `cast.started` | media | behavioral | A cast session starts. |
| `cast.failed` | media | diagnostic | A cast attempt or session fails. |
| `receiver.discovered` | media | operational | Receiver discovery observes a receiver category. |

## Forbidden By Default

Do not put these in event properties:

- file paths
- file names
- folder paths
- folder names
- raw clipboard text
- image contents
- raw user content
- email, phone, token, password, secret
- receiver personal names or local network identifiers

## Product Manifest Rule

Every user-facing screen or command added by a product should have either:

- a manifest event descriptor, or
- an explicit note that tracking is intentionally skipped.

Manifest properties must declare `scope: "common"` for SDK common fields and
`scope: "product"` for product-specific fields. Common fields cannot be
redefined by product manifests.

Every approved product manifest must export a versioned catalog. SDK runtime
validation uses that catalog to reject unregistered events before encryption.
