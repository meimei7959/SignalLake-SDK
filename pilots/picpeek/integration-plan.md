# PicPeek Integration Plan

## Objective

Integrate SignalLake SDK into PicPeek in dry-run mode to validate product value, privacy safety, and relay handoff.

## Scope

- `app.opened`
- `screen.viewed`
- `command.invoked`
- `error.occurred`
- local queue and local batch generation
- optional local relay pilot

## Non-goals

- default network upload
- file path or filename collection
- clipboard content collection
- image content collection
- dashboard or analytics implementation

## Product Mapping

PicPeek is a local-first image browsing and review app. Instrumentation should describe semantic actions, not user content.

Recommended mappings:

- app ready -> `app.opened`
- library / preview / settings view -> `screen.viewed`
- folder open / image next / image previous / settings open -> `command.invoked`
- handled queue or integration error -> `error.occurred`

## Repository Handoff

The current SignalLake workspace cannot write to the PicPeek repository. The handoff artifact is this plan plus the dry-run harness. When PicPeek is opened as writable workspace, wire the same calls into the real app.
