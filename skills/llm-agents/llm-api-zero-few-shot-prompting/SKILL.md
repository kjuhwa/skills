---
name: llm-api-zero-few-shot-prompting
description: Call Qwen (DashScope) or OpenAI APIs for zero-shot and few-shot prompting, including streaming responses.
category: llm-agents
version: 1.0.0
version_origin: extracted
tags: [prompting, llm-api, qwen, zero-shot, few-shot]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/Lordog/dive-into-llms.git
source_ref: main
source_commit: f84c04268794ef94f8949808bbc14ab8636763a0
source_project: dive-into-llms
source_path: documents/chapter2/README.md
imported_at: 2026-04-18T00:00:00Z
---

# LLM API Zero-Shot and Few-Shot Prompting

## When to use
- Call a hosted LLM API without training (Qwen/DashScope, OpenAI, Zhipu).
- Zero-shot (instruction only) or few-shot (labeled examples + instruction) prompting.
- Streaming output for real-time display.

## Steps

1. Register and get API key:
   - Qwen/DashScope: https://help.aliyun.com/zh/dashscope/developer-reference/quick-start
   - Zhipu AI: https://open.bigmodel.cn/

2. Install SDK:

```bash
pip install dashscope
```

3. Standard call:

```python
import dashscope
from http import HTTPStatus

resp = dashscope.Generation.call(
    model='qwen-turbo',
    prompt='Give me a recipe using carrots and potatoes.'
)
if resp.status_code == HTTPStatus.OK:
    print(resp.output)
```

4. Streaming call:

```python
response_generator = dashscope.Generation.call(
    model='qwen-turbo',
    prompt='Explain quantum entanglement simply.',
    stream=True,
    top_p=0.8
)
for resp in response_generator:
    print(resp.output['text'], end='')
```

5. For few-shot prompting, prepend labeled examples before the target query.

## Pitfalls
- OpenAI requires VPN in China; prefer DashScope (Qwen) or Zhipu.

## Source
- Chapter 2 of dive-into-llms - documents/chapter2/README.md
