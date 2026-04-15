# Reference implementation notes

Source: `lucida-alarm` —
- `service/changestream/PolicyChangeStreamManager.java`
- `service/changestream/ConfInfoChangeStreamProcessor.java`
- `service/changestream/ConfGroupChangeStreamProcessor.java`

Relevant fields watched (examples): `groupId`, `deleted`, `tags.*`, `tagFilters`, `resourceType`.

Example predicate:

```java
boolean isPolicyRelevant(BsonDocument updated) {
    if (updated.containsKey("groupId")) return true;
    if (updated.containsKey("deleted")) return true;
    return updated.keySet().stream().anyMatch(k -> k.startsWith("tags."));
}
```
