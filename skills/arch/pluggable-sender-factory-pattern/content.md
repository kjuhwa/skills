# Pluggable Sender Factory

## When to use
You already ship 2+ notification/transport channels (SMS, email, webhook, JDBC insert, socket). A new channel is requested. You want one dispatch point instead of `if/else` scattered across services.

## Shape
1. Define an enum `EChannelType { SMS, EMAIL, JDBC, REST_API, SLACK, SOCKET, ... }`.
2. Each concrete sender is a Spring bean implementing `INotificationSender` (or similar) and declares the type(s) it handles.
3. `NotificationSenderFactoryBean` holds `Map<EChannelType, INotificationSender>` populated by constructor injection of `List<INotificationSender>`.
4. `factory.get(type)` returns the right sender, or throws `UnsupportedChannelException`.

## Steps
1. Promote channel-type string literals to a single enum.
2. Extract the common contract: `send(NotificationRequest) -> NotificationResult`.
3. Make each existing handler a `@Component` implementing the contract; add `supports(type)` or a `@ChannelType(EChannelType.SMS)` marker.
4. Add `NotificationSenderFactoryBean` that builds the dispatch map on `@PostConstruct` and validates no type has two handlers (or explicitly picks primary).
5. Replace all direct sender calls with `factory.get(type).send(req)`.
6. Unit test: for each enum value, factory must return a non-null bean.

## Counter / Caveats
- Do NOT use this when there's only one real channel today — YAGNI.
- If senders need different input DTOs, keep the factory but accept a sealed interface, not a bag `Map<String,Object>`.
- If a channel is optional at runtime (excluded via profile), make `factory.get()` return `Optional` instead of throwing — see commit `f99bad4` where Socket was excluded from the list.
