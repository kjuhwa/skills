# tensorflow-js-model-loading-with-url-override — extended notes

This is an extracted draft from the **magika** project at commit `0a8cb9626b`.
See `SKILL.md` for the procedure. Use the source references below to study the
original implementation before adapting the pattern to a new codebase.

## Source references

- `js/src/model.ts:27-31`
- `js/magika.ts:47-90`
- `js/src/magika-options.ts`

## When this pattern is a fit

Shipping an in-browser ML demo where users must be able to swap the default model host (e.g. for offline dev or private deployment).

## When to walk away

- Large models (>10MB) cause slow first-prediction latency; surface a loading state.
- Browser caching is unpredictable; use a Service Worker for offline support.
- Cross-domain hosting needs CORS headers; private/authenticated URLs need a proxy.
- TFJS and ONNX have different op coverage; not every ONNX model converts cleanly.
