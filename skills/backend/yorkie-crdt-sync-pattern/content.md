# Yorkie CRDT sync — call shapes

## Local → remote
```ts
doc.update(root => {
  root.nodeTree[id] = next;
});
```

## Remote → local
```ts
pullRemoteChangesIntoLocal();                    // full
pullRemoteChangesIntoLocalWithNodeIds(nodeIds);  // scoped
```

## Anti-patterns
- A `pushLocalChangesIntoRemote()`-style helper that wraps `doc.update`. Adds a layer, invites drift, and splits ownership of the update path.
- Storing metadata (project list, finder entries) inside the Yorkie doc. Keep those on the team server; the Yorkie doc is for realtime canvas state only.
- Mixing `doc.update` with non-CRDT mutation (direct Recoil writes on shared state) without re-syncing.
