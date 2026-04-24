# @openbnb/feedback-memory

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

## Publish or copy

This repository is intended to stand on its own:

- run `npm install && npm run build`
- publish with `npm publish`
- or consume it from another project as a normal npm package

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
- License: MIT. See `LICENSE`.
