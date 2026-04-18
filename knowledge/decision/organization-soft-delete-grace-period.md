---
version: 0.1.0-draft
tags: [decision, organization, soft, delete, grace, period]
name: organization-soft-delete-grace-period
category: decision
summary: Organization deletion uses a 30-day grace period before permanent removal (DELETE_ORGANIZATION_INTERVAL_DAYS).
source:
  kind: project
  ref: lucida-account@f1efa2ba
---

# Organization Soft-Delete: 30-Day Grace Period

**Fact.** Deleting an organization marks `dtime` but retains data for 30 days (configurable). A scheduled job sweeps anything past the grace window.

**Why.** Tenant deletion is high-blast-radius — undoing a mis-click that wipes thousands of users + licenses + audit trail is impossible without a grace window. 30 days aligns with typical customer-facing "are you sure" dispute window.

**How to apply.** Never design a feature that assumes "organization deleted → gone immediately". Queries against active orgs must filter `dtime` null. Cleanup/GC code must respect the interval — don't hard-delete on the delete API call.
