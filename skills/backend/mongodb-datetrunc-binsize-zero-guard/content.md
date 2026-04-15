# Context
`$dateTrunc` buckets timestamps into fixed windows of `binSize` units. `binSize=0` is
invalid; the driver throws `MongoCommandException: binSize must be >= 1`.

# Minimal repro
```
db.coll.aggregate([
  { $group: {
      _id: { $dateTrunc: { date: "$ts", unit: "minute", binSize: 0 } }
  }}
])
// => FAILED with: binSize must be >= 1
```

# Safe builder
```java
public AggregationOperation bucketByInterval(long intervalMin) {
    int binSize = intervalMin <= 0 ? 1 : (int) intervalMin;
    return context -> new Document("$group",
        new Document("_id", new Document("$dateTrunc", new Document()
            .append("date", "$ts")
            .append("unit", "minute")
            .append("binSize", binSize))));
}
```

# Counter / Caveats
- `binSize` is integer — don't pass fractional minutes (convert to a smaller unit).
- Negative or overflowed values also throw; cap at a sane max if interval is user-driven.
