# Polymorphic command entities over JSON (Jackson)

## Problem

You want clients to POST a *list of steps* — "navigate, click, fill, screenshot" — and have the server execute them. Each step has different fields. Plain Jackson can't pick the right subclass from `{"@type": "..."}` without help, and splitting every step into its own endpoint explodes the API surface.

## Pattern

1. Define an action interface with an `execute(...)` contract and a `StaticFactory` result.
2. Declare `@JsonTypeInfo` + `@JsonSubTypes` on the list field (or on the base type) so Jackson routes each JSON object to the right concrete class using a discriminator property.
3. Give every concrete action a no-arg constructor plus getters/setters so Jackson can deserialize it.

```java
public interface PageAction {
  ActionResult execute(Page page, BrowserContext ctx);
  String getActionName();
}

public class Script {
  @JsonTypeInfo(use = JsonTypeInfo.Id.NAME,
                include = JsonTypeInfo.As.PROPERTY,
                property = "@type")
  @JsonSubTypes({
    @JsonSubTypes.Type(value = GotoAction.class,       name = "GotoAction"),
    @JsonSubTypes.Type(value = ClickAction.class,      name = "ClickAction"),
    @JsonSubTypes.Type(value = FillAction.class,       name = "FillAction"),
    @JsonSubTypes.Type(value = ScreenshotAction.class, name = "ScreenshotAction")
  })
  private List<PageAction> actions;
}

public static class GotoAction implements PageAction {
  private String url;
  public GotoAction() {}                  // Jackson needs a no-arg ctor
  public GotoAction(String url) { this.url = url; }
  public String getUrl() { return url; }  // getter+setter for Jackson
  public void setUrl(String url) { this.url = url; }
  public ActionResult execute(Page page, BrowserContext ctx) {
    page.navigate(url);
    return ActionResult.success("Navigated: " + url);
  }
  public String getActionName() { return "goto"; }
}
```

Clients send:

```json
{
  "name": "login",
  "actions": [
    {"@type": "GotoAction",  "url": "https://example.com/login"},
    {"@type": "FillAction",  "selector": "#user", "value": "alice"},
    {"@type": "ClickAction", "selector": "#submit"}
  ]
}
```

The server loops `actions`, calls `execute`, and returns a list of `ActionResult`.

## When to use

- Any REST endpoint that runs an ordered pipeline the caller assembles (browser automation, data pipelines, workflow runners, macro replay).
- Anywhere you'd otherwise build 20 near-identical endpoints for small command variants.

## Pitfalls

- **Every concrete action needs a public no-arg constructor** plus getters/setters — Jackson can't pick private fields without a mix-in or `@JsonCreator`.
- **Discriminator property collides with a field named `@type`** — pick something else (`"kind"`, `"op"`) if your payloads already use `@type`.
- **The `@JsonSubTypes` list is a hand-maintained registry.** Adding a new action means editing the list; forgetting to register it produces `InvalidTypeIdException`. Consider scanning a package at startup if the list grows large.
- **Don't put business logic in the entity `execute`.** Keep the action a thin adapter over a service; otherwise you can't reuse the logic from non-HTTP callers (CLI, scheduler).
- **Return a result per action** (`List<ActionResult>`) so the client can see which step failed without parsing exception messages.
