# Reference content

Exclusion list extracted from `build.gradle` at `lucida-topology@8729ca3`:

- `**/avro/**`
- `**/config/**`
- `**/constants/**`
- `**/dto/**`
- `**/kafka/**`
- `**/entity/**`
- `**/*Dev.java`
- `**/Application.java`
- `**/monitor/**`
- `**/QA*` … `**/QZ*` (QueryDSL generated classes, if present)

Sonar-only additions: `**/controller/schema/*`, `**/domain/*`, `**/file/*`, `**/util/*`,
`**/schedule/*`, `**/exception/**`, `**/helper/**`, `**/repository/**`, `**/event/**`,
`**/listener/**`.

The controller/repository/util excludes are more aggressive than most projects need — they
assume thin delegation layers with no branch logic. Start with the core list in `SKILL.md` and
expand only when a specific class's coverage number is misleading.
