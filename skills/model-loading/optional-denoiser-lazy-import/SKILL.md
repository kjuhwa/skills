---
name: optional-denoiser-lazy-import
description: Lazy-load an optional audio denoiser pipeline only when explicitly enabled at construction time
category: model-loading
version: 1.0.0
tags: [model-loading, lazy-import, optional-dependency, denoiser, python]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/OpenBMB/VoxCPM.git
source_ref: main
source_commit: 13605c5a0e6b99d6d3527a43bd1a4e0e69c8800e
source_project: VoxCPM
source_paths:
  - src/voxcpm/core.py
  - src/voxcpm/zipenhancer.py
imported_at: 2026-04-18T00:00:00Z
version_origin: extracted
---

# Lazy-load optional audio denoiser pipeline only when enabled

## When to use
Use this pattern when a component has an optional heavyweight dependency (a separate neural network, a large library) that most users will not need. Deferring the import and instantiation to the constructor — gated behind an explicit flag — keeps startup fast for the common case and avoids import errors for users who never install the optional dependency.

## Pattern

### Constructor with lazy import
```python
from typing import Optional
from pathlib import Path

class VoxCPMInference:
    def __init__(
        self,
        model_path: str,
        enable_denoiser: bool = False,
        denoiser_model_path: Optional[str] = None,
        device: str = "cuda",
    ):
        self.device = device

        # Load main model (always required)
        self.model = self._load_main_model(model_path)

        # Lazy-load denoiser only when both conditions are met
        self.denoiser = None
        if enable_denoiser and denoiser_model_path:
            self.denoiser = self._load_denoiser(denoiser_model_path)

    def _load_main_model(self, model_path: str):
        from voxcpm.model.voxcpm2 import VoxCPM2Model
        return VoxCPM2Model.from_local(model_path).to(self.device).eval()

    def _load_denoiser(self, denoiser_path: str):
        # Import deferred here — ZipEnhancer has heavy deps (onnxruntime, etc.)
        from voxcpm.zipenhancer import ZipEnhancer
        return ZipEnhancer(model_path=denoiser_path, device=self.device)
```

### Inference path checks None before applying
```python
    def generate(self, text: str, **kwargs) -> "torch.Tensor":
        import torch
        with torch.no_grad():
            audio = self.model.generate(text=text, **kwargs)

        # Apply denoiser only if loaded
        if self.denoiser is not None:
            audio = self.denoiser.enhance(audio)

        return audio
```

### ZipEnhancer stub (shows the interface contract)
```python
# src/voxcpm/zipenhancer.py
class ZipEnhancer:
    """
    Lightweight wrapper around a speech enhancement model (e.g., ZipEnhancer / ONNX).
    Not imported unless enable_denoiser=True.
    """
    def __init__(self, model_path: str, device: str = "cuda"):
        import onnxruntime as ort  # heavy optional dep
        self.session = ort.InferenceSession(
            str(Path(model_path) / "denoiser.onnx"),
            providers=["CUDAExecutionProvider"] if device == "cuda" else ["CPUExecutionProvider"],
        )

    def enhance(self, audio: "torch.Tensor") -> "torch.Tensor":
        import numpy as np
        import torch
        audio_np = audio.cpu().numpy()
        enhanced = self.session.run(None, {"input": audio_np})[0]
        return torch.from_numpy(enhanced).to(audio.device)
```

### User-facing API
```python
# Without denoiser (default — fast startup)
model = VoxCPMInference(model_path="./voxcpm2-2b")
audio = model.generate("Hello world.")

# With denoiser (opt-in)
model = VoxCPMInference(
    model_path="./voxcpm2-2b",
    enable_denoiser=True,
    denoiser_model_path="./zipenhancer",
)
audio = model.generate("Hello world.")  # automatically denoised
```

## Source reference
- Upstream: `OpenBMB/VoxCPM` @ `main` / `13605c5a`
- Key files:
  - `src/voxcpm/core.py:89-95` — constructor gating with `enable_denoiser` + path check
  - `src/voxcpm/zipenhancer.py:1-60` — ZipEnhancer implementation with deferred onnxruntime import

## Notes
- Both `enable_denoiser=True` AND a non-None path are required; the flag prevents accidental activation when no path is configured.
- If the denoiser import fails (missing onnxruntime), it raises at `_load_denoiser` call time, not at module import — which is the intended behavior for optional deps.
- Do not move the denoiser `import` to module level; that would break imports for users who haven't installed the optional dependency.
