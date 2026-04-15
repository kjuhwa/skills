# Background

Root cause this pattern addresses (lucida-meta, issue #91850 / d8b9bb8):

> *"최초 기동할 때 조직생성과 meta 초기화 충돌방지를 위해 Lock 적용"* — on first boot, org creation (from Account service via Kafka) raced with meta init, causing partial/duplicate seed writes.

The lock is the fix; the database-count gate is the *pre-condition* so the lock isn't acquired too early to be useful (databases don't exist yet).

## Signals that you need this

- Your loader sometimes writes duplicate defaults after a scale-out.
- Integration tests pass but prod shows interleaved writes from two pods.
- Log shows loader starting before tenant database appears.
