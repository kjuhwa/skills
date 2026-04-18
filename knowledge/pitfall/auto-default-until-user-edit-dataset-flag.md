---
version: 0.1.0-draft
name: auto-default-until-user-edit-dataset-flag
description: Track whether a prefilled form field is still "auto" via a dataset flag so regeneration doesn't clobber user edits.
category: pitfall
tags:
  - fnv1a
  - auto-loop
---

# auto-default-until-user-edit-dataset-flag

When a form auto-populates a field (derived name, suggested slug, computed title) *and* the user can edit it, naive code will overwrite the user's edit the next time the generator runs. The fix is a one-bit `dataset.auto` flag: start at `'1'`, flip to `'0'` on the `input` event, and gate regeneration on the flag.

```js
// on regenerate
if (cname.value === 'Untitled' || cname.dataset.auto === '1') {
  cname.value = derivedName(seed);
  cname.dataset.auto = '1';
}
// once user types
cname.addEventListener('input', () => { cname.dataset.auto = '0'; });
```

Why this over "just don't auto-fill if it's non-empty": the user often wants to *undo* their override and return to auto — clearing the field alone can't signal that, because the derived value was also once "non-empty". The tri-state (auto / user / cleared) lives cleanly on `dataset` without React/Vue refs, survives DOM serialization, and also works for `<input>`, `<textarea>`, contenteditable. Same trap shows up in auto-generated slugs, chart titles, commit messages, filenames — anywhere a "helpful" re-derivation can steal the user's keystrokes.
