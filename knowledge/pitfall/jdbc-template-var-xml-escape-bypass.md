---
version: 0.1.0-draft
tags: [pitfall, jdbc, template, var, xml, escape]
name: jdbc-template-var-xml-escape-bypass
category: pitfall
summary: When the template engine XML-escapes values but the downstream channel is raw SQL / plain text, the escaped `&amp; &lt; &gt;` leaks into stored data
source:
  kind: project
  ref: lucida-notification@release-10.2.4_2
  evidence:
    - "commit ece284e — '메세지 치환 시 xml ignore안되게 수(정)'"
    - "commit 6482518 / 406aa72 — '표현식 치환 문제 수정'"
confidence: medium
---

## Fact
The FreeMarker pipeline applied XML auto-escape to every variable. For email/HTML that's correct. For the JDBC SMS insert channel and the plain-text SMS body, it corrupted data: an operator-written `A & B` became `A &amp; B` in the `sms_message.message` column.

## Why it bit us
One template engine served multiple channels. The default (escape on) was chosen for the HTML channel and never re-examined for the plain channels. Nobody spotted it until the DB table contained literal `&amp;` strings in customer traffic.

## How to apply
- Template engines should be configured **per channel**, not globally. HTML/email → escape on; SMS/JDBC/socket/plain → escape off.
- When adding a new channel, explicitly set the escape policy; don't rely on the default.
- The `${plain_message}` variable convention (`plain_` prefix) is a deliberate signal that this value must not be escaped — enforce in code review.

## Counter / Caveats
- Turning escape off makes SQL-injection the user's problem again — pair this with either prepared statements (preferred) or at minimum single-quote escaping on the channel input (see `jdbc-configurable-sql-insert-sender`).
