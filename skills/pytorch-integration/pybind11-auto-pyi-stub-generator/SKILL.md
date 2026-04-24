---
name: pybind11-auto-pyi-stub-generator
description: Auto-generate typed `.pyi` stubs for a pybind11 extension by scraping `m.def(...)` call sites and matching the C++ function signature across the repo — no manual stub maintenance.
category: pytorch-integration
version: 1.0.0
version_origin: extracted
tags: [pybind11, pyi, type-stubs, build-system, python, code-generation]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/deepseek-ai/DeepGEMM.git
source_ref: main
source_commit: 7f2a703ed51ac1f7af07f5e1453b2d3267d37d50
source_project: DeepGEMM
source_paths:
  - scripts/generate_pyi.py
  - setup.py
imported_at: 2026-04-18T13:30:00Z
---

# Auto-Generate `.pyi` Stubs From pybind11 `m.def` Sites

## When to use
Your project exposes a native `pybind11` extension and you want IDE autocomplete and type hints for the bound functions, but you don't want to manually keep a stub file in sync with 80+ C++ entry points. Instead, generate the stub file at build time by scraping your source.

## Steps
1. **Build a function index** over `*.cpp / *.hpp / *.cc / *.cxx / *.h` under the project root:
   - Regex out `<return-type> <name>(...)` definitions.
   - Skip keywords (`if`, `for`, `auto`, ...).
   - Balance parens with a `BracketTracker` class (counts `()[]{}<>`; `<>` only at top level).
   - Store the first-seen signature per basename.
2. **Scrape every `m.def(...)` site** — multi-line aware (parens balanced across line breaks). Skip comment lines.
3. **Parse each `m.def` statement.** Pull out:
   - The Python name from the first string-literal argument.
   - The C++ function name (strip `&` and namespace) OR flag as `is_lambda` if it starts with `[`.
   - `py::arg("name") = default_value` — find the top-level `=` using the same `BracketTracker`.
4. **Cross-reference C++ function name to the index** → recover the original declaration.
5. **Parse the C++ signature** — split params by top-level commas, extract `type` and `name` by scanning from the right for the last identifier outside brackets.
6. **Map C++ types to Python types** with a small rule set:
   - `torch::Tensor` → `torch.Tensor`
   - `std::string` / `char*` → `str`
   - `std::pair<A, B>` → `tuple[A, B]`
   - `std::tuple<...>` → `tuple[...]`
   - `std::vector<T>` → `list[T]`
   - `std::optional<T>` → `Optional[T]`
   - `int|long|size_t|...` → `int`; `float|double` → `float`; `bool` → `bool`; `void` → `None`
   - Unknown → `Any` (with a warning).
7. **Emit the `.pyi`** as `def {name}(\n    {arg}: {type} = {default},\n    ...\n) -> {ret}: ...` and stack them.
8. **Wire into `setup.py`:**
   ```python
   class CustomBuildPy(build_py):
       def run(self):
           generate_pyi_file(name='_C', root='./csrc', output_dir='./stubs')
           shutil.copy2('stubs/_C.pyi', f'{build_lib}/<pkg>/_C.pyi')
           build_py.run(self)
   ```
   The `.pyi` then rides along in the wheel.

## Evidence (from DeepGEMM)
- `scripts/generate_pyi.py:5-94`: `build_cpp_function_index` with regex + balanced-paren walk.
- `scripts/generate_pyi.py:97-149`: `BracketTracker` — the linchpin. Without correct handling of `<>` only at top level, template types (`std::pair<int, int>`) break the splitter.
- `scripts/generate_pyi.py:608-696`: `cpp_type_to_python_type` rule table.
- `setup.py:114-139`: `CustomBuildPy.generate_pyi_file()` — hook into `build_py` so the stub copies into the wheel layout.

## Counter / Caveats
- **Lambdas in `m.def` lose their signature.** They become `def fn(*args, **kwargs) -> Any: ...`. Mitigation: bind named free functions and call the lambda logic from there when you want precise stubs.
- **Function-index is basename-keyed, not fully-qualified.** If two namespaces declare `void reset()`, the first one wins. Keep names unique-per-repo or extend the index with a namespace key.
- **The signature regex is greedy on return types.** Template-heavy returns (`std::tuple<int, std::vector<float>>`) sometimes fail to match — fall back to `Any` rather than crashing.
