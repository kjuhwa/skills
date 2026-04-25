---
name: kgw-text-watermark-embed-detect
description: Embed KGW watermarks into LLM-generated text and detect them via z-score using the X-SIR repository.
category: security
version: 1.0.0
version_origin: extracted
tags: [watermark, kgw, x-sir, llm-safety]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/Lordog/dive-into-llms.git
source_ref: main
source_commit: f84c04268794ef94f8949808bbc14ab8636763a0
source_project: dive-into-llms
source_path: documents/chapter5/README.md
imported_at: 2026-04-18T00:00:00Z
---

# KGW Text Watermark: Embed and Detect

## When to use
- Embed an invisible watermark into LLM-generated text detectable via z-score.
- Using the KGW algorithm via the X-SIR codebase.
- Evaluate detection AUC and robustness against paraphrase/translation attacks.

## Steps

1. Clone and set up X-SIR:

```bash
git clone https://github.com/zwhe99/X-SIR && cd X-SIR
conda create -n xsir python==3.10.10 && conda activate xsir
pip3 install -r requirements.txt
```

2. Generate watermarked text:

```bash
python3 gen.py \
    --base_model baichuan-inc/Baichuan-7B \
    --fp16 \
    --batch_size 32 \
    --input_file data/dataset/mc4/mc4.en.jsonl \
    --output_file gen/baichuan-7b/kgw/mc4.en.mod.jsonl \
    --watermark_method kgw
```

3. Detect z-score on watermarked text:

```bash
python3 detect.py \
    --base_model baichuan-inc/Baichuan-7B \
    --detect_file gen/baichuan-7b/kgw/mc4.en.mod.jsonl \
    --output_file gen/baichuan-7b/kgw/mc4.en.mod.z_score.jsonl \
    --watermark_method kgw
```

4. Detect z-score on human (non-watermarked) text:

```bash
python3 detect.py \
    --base_model baichuan-inc/Baichuan-7B \
    --detect_file data/dataset/mc4/mc4.en.jsonl \
    --output_file gen/baichuan-7b/kgw/mc4.en.hum.z_score.jsonl \
    --watermark_method kgw
```

5. Evaluate detection accuracy:

```bash
python3 eval_detection.py \
    --hm_zscore gen/baichuan-7b/kgw/mc4.en.hum.z_score.jsonl \
    --wm_zscore gen/baichuan-7b/kgw/mc4.en.mod.z_score.jsonl \
    --roc_curve roc
```

Expected: AUC ~1.000, TPR@FPR=0.01 ~0.998

## Pitfalls
- Watermarked text z-scores (~12) vs human text (~1-2) show clear separation.
- Robustness testing requires an OpenAI API key for gpt-3.5-turbo-1106.

## Source
- Chapter 5 of dive-into-llms - documents/chapter5/README.md
