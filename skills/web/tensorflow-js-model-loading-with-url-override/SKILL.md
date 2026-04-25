---
name: tensorflow-js-model-loading-with-url-override
description: Browser-side ML library lazily fetches a TensorFlow.js model from a default CDN URL but accepts a MagikaOptions.modelURL override for local hosting / private CDN.
category: web
version: 1.0.0
version_origin: extracted
confidence: medium
tags: [magika, web]
source_type: extracted-from-git
source_url: https://github.com/google/magika.git
source_ref: main
source_commit: 0a8cb9626bbf76c2194117d9830b23e9052a1548
source_project: magika
imported_at: 2026-04-18T00:00:00Z
---

# Tensorflow Js Model Loading With Url Override

**Trigger:** Shipping an in-browser ML demo where users must be able to swap the default model host (e.g. for offline dev or private deployment).

## Steps

- Define MagikaOptions { modelURL?: string; modelConfigURL?: string }.
- In Magika.create(opts), default modelURL to the canonical CDN (e.g. github.io/magika/models/<version>/).
- Lazy-load model + config on the first identify() call; cache the loaded session on the instance.
- Document the required hosting layout: model.json + weight shards (model.weights.bin, weights.{0,1}.bin).
- Convert your ONNX model to TFJS via tfjs-converter — you can't serve raw ONNX to the browser via TFJS.
- Add CORS guidance: cross-origin model URLs need Access-Control-Allow-Origin.

## Counter / Caveats

- Large models (>10MB) cause slow first-prediction latency; surface a loading state.
- Browser caching is unpredictable; use a Service Worker for offline support.
- Cross-domain hosting needs CORS headers; private/authenticated URLs need a proxy.
- TFJS and ONNX have different op coverage; not every ONNX model converts cleanly.

## Source

Extracted from `magika` (https://github.com/google/magika.git @ main).

Files of interest:
- `js/src/model.ts:27-31`
- `js/magika.ts:47-90`
- `js/src/magika-options.ts`
