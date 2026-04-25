---
version: 0.1.0-draft
name: tensorflow-js-for-browser-deployment
type: knowledge
category: arch
summary: The web demo uses a TensorFlow.js model for on-device, browser-based inference (no server round trip).
confidence: high
tags: [magika, arch]
linked_skills: [tensorflow-js-model-loading-with-url-override]
source_type: extracted-from-git
source_url: https://github.com/google/magika.git
source_ref: main
source_commit: 0a8cb9626bbf76c2194117d9830b23e9052a1548
source_project: magika
imported_at: 2026-04-18T00:00:00Z
---

# Tensorflow Js For Browser Deployment

## Fact

The browser demo at securityresearch.google/magika/demo loads a TFJS-converted model and runs entirely client-side. Same trained weights as the ONNX model but converted via tfjs-converter. This unlocks an offline-capable demo and validates the model on web targets.

## Evidence

- `website-ng/src/content/docs/additional-resources/faq.md:18-20`
- `js/README.md:1-7`
