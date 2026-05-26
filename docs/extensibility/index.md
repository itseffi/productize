# Productize Extension Author Guide

Productize extensions let you add executable hooks, event subscribers, review-provider overlays, and installable skill packs without rebuilding the Productize binary.

This v1 authoring surface ships with:

- `@productize/extension-sdk` for TypeScript and JavaScript authors
- `@productize/create-extension` for project scaffolding
- `sdk/extension` for Go authors
- four starter templates: `lifecycle-observer`, `prompt-decorator`, `review-provider`, and `skill-pack`

The extension protocol version is `1`. The TypeScript SDK, scaffolder, and Productize runtime are intended to ship in lockstep for each release.

## Start here

- [`Getting started`](./getting-started.md)
- [`Hello world in TypeScript`](./hello-world-ts.md)
- [`Hello world in Go`](./hello-world-go.md)

## Core concepts

- [`Architecture overview`](./architecture.md)
- [`Hook reference`](./hook-reference.md)
- [`Host API reference`](./host-api-reference.md)
- [`Capability reference`](./capability-reference.md)
- [`Trust and enablement`](./trust-and-enablement.md)

## Author workflow

- [`Testing extensions`](./testing.md)
- [`Migration guide from early prototypes`](./migration-guide.md)

## Recommended path

1. Scaffold a project with `npx @productize/create-extension my-ext`.
2. Pick the closest starter template.
3. Build and test locally.
4. Install it with `productize ext install`.
5. Enable it with `productize ext enable`.
6. Validate behavior with the test harness and a real Productize run before distributing it.
