# Excel Download — Null-Safe Filter Handling

Grid-export endpoints often reuse the same filter DTO as the list endpoint, but the grid always sends default values while the export button may POST an empty body. This causes NPE / memory blow-up bugs.

## Rules

1. **Null-check every filter before using it in the query.** Don't rely on `@NotNull` — the export button often calls without UI defaults applied.
2. **Normalize field aliases** (e.g., UI sends `cTime`, DB field is `ctime`) in one mapper method shared between list & export.
3. **Cap unbounded date ranges** — if `from`/`to` are null, apply an implicit 30-day window (or reject with 400) to prevent "export everything" OOMs.
4. **Stream the response** — use `SXSSFWorkbook` or CSV streaming, not an in-memory `XSSFWorkbook` for >10k rows.

## Skeleton

```java
@PostMapping("/excel")
public void download(@RequestBody(required = false) FilterRequest req,
                     HttpServletResponse res) throws IOException {
    FilterRequest safe = (req == null) ? FilterRequest.empty() : req;
    safe.normalizeFieldAliases();          // cTime -> ctime, etc.
    safe.applyDefaultDateRange(Duration.ofDays(30));
    try (var wb = new SXSSFWorkbook(1000)) {
        exportService.streamTo(wb, safe);
        res.setContentType("application/vnd.ms-excel");
        wb.write(res.getOutputStream());
    }
}
```

## Pitfalls observed

- MongoDB excel-export OOM when filter has no date range: the driver loads all matching docs at once. Always use `.batchSize()` cursor + streaming workbook.
- `null` date-range values passed to `$gte`/`$lte` match EVERYTHING in MongoDB — opposite of the intuitive "skip this filter".
