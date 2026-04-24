# @openbnb/feedback-memory

[![Verify Dist](https://github.com/OpenlabSimon/feedback-memory/actions/workflows/verify-dist.yml/badge.svg)](https://github.com/OpenlabSimon/feedback-memory/actions/workflows/verify-dist.yml)

Reusable traveler-feedback memory helpers.

## What is in this package

- feedback type normalization
- per-user feedback profile aggregation
- preference summary generation
- recent feedback loading
- listing feedback scoring
- sqlite helper for saving listing feedback rows

## Build

```bash
npm install
npm run build
```

Build output goes to `dist/`.

## Reuse

This repository is intended to stand on its own:

- run `npm install && npm run build`
- keep `dist/` committed so GitHub installs work without a local build
- consume it from another project through GitHub

## Install From GitHub

The repository includes committed `dist/` output so GitHub dependency installs
do not need a local build step.

```bash
npm install github:OpenlabSimon/feedback-memory
```

Or in `package.json`:

```json
{
  "dependencies": {
    "@openbnb/feedback-memory": "github:OpenlabSimon/feedback-memory"
  }
}
```

## Example

```ts
import {
  loadUserFeedbackProfile,
  buildUserMemorySummary,
  scoreFeedback,
  saveListingFeedback,
} from "@openbnb/feedback-memory";
```

## Notes

- The package intentionally depends only on Node built-ins and `node:sqlite`.
- Consumers are expected to provide their own listing shape; the package only requires the feedback-relevant fields.
- `dist/` is checked into git on purpose so GitHub installs can resolve `main` and `types` immediately.
- CI only verifies `src` and committed `dist` stay in sync. npm publishing is intentionally not configured.
- License: MIT. See `LICENSE`.
