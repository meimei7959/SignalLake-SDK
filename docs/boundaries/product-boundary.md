# SignalLake SDK Product Boundary

## Current Project

SignalLake SDK.

## Adjacent Products

- SignalLake Edge
- SignalLake Agent
- SignalLake Console

## Boundary Rule

The SDK collects, shapes, validates, caches, and uploads events.

Edge stores and computes data.

Agent queries and explains data.

Console configures, visualizes, and manages data products.

## Handoff Contract

SignalLake SDK should output:

- event payload contract
- identity/session contract
- upload contract
- privacy-control contract
- error/retry contract
- integration examples

SignalLake Edge or any receiver can consume these contracts.

