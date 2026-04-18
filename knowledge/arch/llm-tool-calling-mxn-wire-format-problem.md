---
version: 0.1.0-draft
tags: [arch, llm, tool, calling, mxn, wire]
name: llm-tool-calling-mxn-wire-format-problem
category: arch
summary: Open-source LLMs each encode tool calls in a different wire format (special tokens, XML, channel notation, JSON blocks), so M inference apps × N models = M×N parsers. Fix is declarative tool-call specs shipped with the model and consumed by both grammar engines and parsers.
source:
  kind: web-research
  ref: skills_research:trend:2026-04-16
---

# The M×N problem of LLM tool calling

**Fact.** Open-source LLMs each define their own tool-calling wire format, chosen at training time: GPT-OSS uses `<|channel|>` notation; DeepSeek uses special-token markers with JSON blocks inside; GLM5 uses XML-style `<arg_key>` / `<arg_value>` pairs with no JSON at all. Every inference application (vLLM, SGLang, TensorRT-LLM, llama.cpp, etc.) implements a custom parser for each model — M applications × N models of duplicated parser code. The problem hits at two stages: generation (grammar engines like Outlines/XGrammar must constrain output to the model's format) and parsing (inference engines must extract the call back out). Both stages require identical format knowledge; today both reverse-engineer it independently.

**Why.** Wire formats are training-time decisions, and nothing constrains them to a shared convention. When a new model drops, every inference-engine team debugs its quirks in parallel. Recent example: Gemma 4 leaked reasoning tokens into tool arguments, and the decoder stripped special tokens before the parser saw them. The ecosystem already converged on shared *chat templates*; tool calling hasn't had that convergence moment yet.

**How to apply.** When adding tool calling to an inference server, budget real engineering per model — not "one generic parser." Track the wire format as a first-class artifact (boundary tokens, argument serialization, reasoning-token behavior) separately from the prompt template. Advocate for and consume declarative tool-call specs shipped alongside a model in the same slot as `chat_template.jinja`, so both grammar engines and parsers read the same source of truth. Don't assume a new OSS model will "just work" with your existing parser — add a fixture pass per model before enabling tool mode.

**Counter / caveats.** Some shops standardize on one model family to sidestep the problem entirely — viable if model choice isn't a strategic lever. Closed-source APIs hide the wire format; you pay the same cost inside the vendor, you just don't see it.

## Sources

- https://www.thetypicalset.com/blog/grammar-parser-maintenance-contract — "The M×N problem of tool calling and open-source models" (2026). Single essay; medium confidence — well-aligned with vLLM/SGLang issue-tracker discussion but one author's framing.
