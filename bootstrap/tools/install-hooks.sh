#!/usr/bin/env bash
# ~/.claude/skills-hub/remote/.git/hooks/ 에 index 재생성 훅을 설치한다.
#
# 트리거 이벤트:
#   post-merge     git pull / merge 뒤
#   post-commit    로컬 커밋 뒤
#   post-checkout  브랜치 전환 뒤 (index.json 이 변경됐을 때만)
#
# 사용법:
#   bash ~/.claude/skills-hub/tools/install-hooks.sh
#
# 재-clone 후 한 번만 실행하면 된다. 이미 설치되어 있으면 덮어쓰기.

set -euo pipefail

HOOKS_DIR="$HOME/.claude/skills-hub/remote/.git/hooks"
TOOLS_DIR="$HOME/.claude/skills-hub/tools"

if [[ ! -d "$HOOKS_DIR" ]]; then
    echo "install-hooks: $HOOKS_DIR does not exist (is the hub cloned?)" >&2
    exit 1
fi

write_hook() {
    local name="$1"
    local extra_check="$2"
    local path="$HOOKS_DIR/$name"
    cat > "$path" <<EOF
#!/usr/bin/env bash
# Auto-regenerate hub indexes after mutations. Installed by tools/install-hooks.sh.
set -e
${extra_check}
PYTHONIOENCODING=utf-8 py -3 "$TOOLS_DIR/precheck.py" --skip-lint >/dev/null 2>&1 || true
EOF
    chmod +x "$path"
    echo "  installed: $name"
}

echo "Installing skills-hub git hooks…"

write_hook "post-merge" ""
write_hook "post-commit" ""
# post-checkout: always regen — ensures deleted/stale indexes are rebuilt.
# Skip if the checkout is a file-level checkout rather than a branch/ref.
write_hook "post-checkout" \
'[[ "${3:-}" == "1" ]] || exit 0'

echo "Done. Hooks will run hub-precheck (skip-lint) on merge / commit / branch-switch."
