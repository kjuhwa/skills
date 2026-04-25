---
name: model-regression-test-with-csv-fixture
description: Lock down a model's deterministic output by committing input+expected-output CSVs and re-running with a generator script when intentionally changing behavior.
category: testing
tags: [regression-test, pytest, ml-model-testing, determinism, fixtures, golden-file]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/shiyu-coder/Kronos.git
source_ref: master
source_commit: 67b630e67f6a18c9e9be918d9b4337c960db1e9a
source_project: Kronos
source_paths: [tests/test_kronos_regression.py, tests/data/generate_regression_output.py]
version: 1.0.0
version_origin: extracted
imported_at: 2026-04-18T00:00:00Z
---

# CSV golden-file regression test for a non-trivial model

## When to use
- Your model has deterministic (or seedable) output that is easy to serialize as a small table.
- You want CI to fail any time a refactor accidentally changes predictions, even slightly.
- You want a single script (committed alongside the fixture) that re-generates the "expected" file when changes are intentional — so the update process is one command, not a manual copy-paste.

## Pattern
Commit three artifacts: `regression_input.csv` (realistic but small), one `regression_output_<config>.csv` per parametrization, and a `generate_regression_output.py` that recreates every `regression_output_*.csv` from the input. The test pins model+tokenizer by commit hash, re-seeds every RNG the library touches, and asserts `np.allclose` with a small `rtol`. Parametrize over the meaningful dimensions (here, context length). A second test checks a secondary metric (MSE over random slices) with a very tight tolerance to catch even subtle numeric drift.

```python
# tests/test_kronos_regression.py
MODEL_REVISION     = "901c26c1332695a2a8f243eb2f37243a37bea320"
TOKENIZER_REVISION = "0e0117387f39004a9016484a186a908917e22426"
REL_TOLERANCE      = 1e-5

def set_seed(seed):
    random.seed(seed); np.random.seed(seed); torch.manual_seed(seed)
    if torch.backends.cudnn.is_available():
        torch.backends.cudnn.deterministic = True
        torch.backends.cudnn.benchmark     = False

@pytest.mark.parametrize("context_len", [512, 256])
def test_kronos_predictor_regression(context_len):
    set_seed(123)
    df          = pd.read_csv(TEST_DATA_ROOT / "regression_input.csv", parse_dates=["timestamps"])
    expected_df = pd.read_csv(TEST_DATA_ROOT / f"regression_output_{context_len}.csv")
    expected    = expected_df[FEATURE_NAMES].values.astype(np.float32)

    tokenizer = KronosTokenizer.from_pretrained("NeoQuasar/Kronos-Tokenizer-base", revision=TOKENIZER_REVISION)
    model     = Kronos.from_pretrained("NeoQuasar/Kronos-small",            revision=MODEL_REVISION)
    predictor = KronosPredictor(model, tokenizer, device="cpu", max_context=512)

    with torch.no_grad():
        pred_df = predictor.predict(df=context_df[FEATURE_NAMES], ...,
                                    T=1.0, top_k=1, top_p=1.0, sample_count=1)
    np.testing.assert_allclose(pred_df[FEATURE_NAMES].to_numpy(np.float32),
                               expected, rtol=REL_TOLERANCE)
```

The companion script regenerates fixtures when behavior changes intentionally:

```python
# tests/data/generate_regression_output.py — mirrors the test config so updates are one command
for ctx_len in [512, 256]:
    generate_output(ctx_len)        # writes regression_output_<ctx_len>.csv
```

## Why it works / tradeoffs
Pinning the model commit + CPU device + full seeding makes the test bit-reproducible across machines. Storing expected outputs as CSV makes diffs reviewable in PRs (unlike `.npy`). The separate generator script avoids the anti-pattern of "test has a --update-expected flag" — the regenerate step is deliberate and explicit. Cost: CSV round-tripping through float32 limits `rtol` to about `1e-6`. For stochastic components, choose a deterministic sampling config (`top_k=1, top_p=1.0`) — see the sibling skill on temperature/top-k/top-p filter.

## References
- `tests/test_kronos_regression.py` in Kronos — main test, parametrized over context length
- `tests/data/generate_regression_output.py` — fixture regenerator
- `tests/data/regression_input.csv` and `regression_output_{256,512}.csv` — committed fixtures
