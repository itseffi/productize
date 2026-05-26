# @productize/extension-sdk

TypeScript SDK for Productize executable extensions.

The package mirrors the public Go SDK in [`sdk/extension`](../extension) and speaks the Productize extension protocol over line-delimited JSON-RPC 2.0 on stdin/stdout.

## Install

```bash
npm install @productize/extension-sdk
```

Node 18+ is required.

## Quick start

```ts
import { Extension } from "@productize/extension-sdk";

const extension = new Extension("hello-ext", "0.1.0").onRunPostShutdown(
  async (_context, payload) => {
    process.stderr.write(`run ${payload.run_id} finished with ${payload.summary.status}\n`);
  }
);

extension.start().catch(error => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
```

## Public surface

- `Extension` manages initialize, hook dispatch, event delivery, health checks, and shutdown.
- `HostAPI` exposes typed clients for `host.events.*`, `host.tasks.*`, `host.runs.*`, `host.artifacts.*`, `host.prompts.render`, and `host.memory.*`.
- `HOOKS`, `CAPABILITIES`, and the exported payload and patch interfaces match protocol version `1`.
- `@productize/extension-sdk/testing` exposes `MockTransport` and `TestHarness` for author-side tests.

## Starter templates

The published package also ships the starter templates used by `@productize/create-extension`:

- `lifecycle-observer`
- `prompt-decorator`
- `review-provider`
- `skill-pack`

## Documentation

- [Author docs](../../.productize/docs/extensibility/index.md)
- [Getting started](../../.productize/docs/extensibility/getting-started.md)
- [Hook reference](../../.productize/docs/extensibility/hook-reference.md)
- [Host API reference](../../.productize/docs/extensibility/host-api-reference.md)
- [Testing guide](../../.productize/docs/extensibility/testing.md)
