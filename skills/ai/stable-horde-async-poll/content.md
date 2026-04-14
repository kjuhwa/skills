# Stable Horde: Submit + Poll Integration

## Problem
Stable Horde (`https://stablehorde.net/api/v2`) is an async, queue-based image generation backend. A single request returns only a job ID; the generated image is available later via a status endpoint. Naive callers that expect a synchronous image URL will see empty responses.

## Pattern

1. **Submit** `POST /generate/async` with JSON body:
   - `prompt`: the full prompt, including a `" ### "` separator followed by negative-prompt terms.
   - `params`: `{ width, height, steps: 30, cfg_scale: 7, sampler_name: "k_euler_a" }`.
   - `nsfw: false`, `censor_nsfw: true`.
   - `models`: a *list* of preferred model names (e.g. `["AnythingV3", "Counterfeit", "Deliberate"]`) so the scheduler falls back if a worker is offline.
   - Header `apikey: 0000000000` — the well-known anonymous key; anonymous users are rate-limited and capped (e.g. max dimension ≤ 1024).

2. **Poll** `GET /generate/status/{id}` every ~3s, up to a bounded number of attempts (e.g. 40 × 3s = 120s). Terminate on:
   - `done == true` → read `generations[0].img` for the image URL.
   - `faulted == true` → give up, log.
   - Timeout → give up, surface a user-facing "image unavailable" state; do not retry the submit automatically.

3. **Timeouts** on the HTTP client must be longer than normal: 10s connect, 60–120s read, because the queue can stall.

## Example (Java, Spring `RestTemplate`)

```java
private static final String HORDE_URL = "https://stablehorde.net/api/v2";

private String submitHordeJob(String prompt) {
    String fullPrompt = prompt
        + " ### low quality, bad anatomy, deformed, blurry, text watermark";
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("prompt", fullPrompt);
    body.put("params", Map.of(
        "width", 512, "height", 768,
        "steps", 30, "cfg_scale", 7,
        "sampler_name", "k_euler_a"));
    body.put("nsfw", false);
    body.put("censor_nsfw", true);
    body.put("models", List.of("AnythingV3", "Counterfeit", "Deliberate"));

    HttpHeaders headers = new HttpHeaders();
    headers.setContentType(MediaType.APPLICATION_JSON);
    headers.set("apikey", "0000000000");

    Map<String, Object> resp = restTemplate.postForObject(
        HORDE_URL + "/generate/async",
        new HttpEntity<>(body, headers), Map.class);
    return (String) resp.get("id");
}

private String pollHordeResult(String jobId) {
    for (int i = 0; i < 40; i++) {
        Thread.sleep(3000);
        Map<String, Object> status = restTemplate.getForObject(
            HORDE_URL + "/generate/status/" + jobId, Map.class);
        if (Boolean.TRUE.equals(status.get("done"))) {
            List<Map<String, Object>> gens =
                (List<Map<String, Object>>) status.get("generations");
            return gens != null && !gens.isEmpty()
                ? (String) gens.get(0).get("img")
                : null;
        }
        if (Boolean.TRUE.equals(status.get("faulted"))) return null;
    }
    return null;
}
```

## When to use

- Side projects, demos, or low-traffic apps where you want free image generation without a paid provider.
- Applications where users tolerate 30–120s latency per image.
- Parallel generation: submit N jobs, then poll all N IDs in a loop — the queue handles concurrency.

## Pitfalls

- **Anonymous rate limits**: `apikey: 0000000000` yields lowest queue priority. For production-ish use, register a real account and use the assigned key.
- **Image dimension cap**: anonymous users max out near 1024 px on any axis. Requesting 1536×1536 silently fails or gets clamped.
- **Model list matters**: if you specify a single model that has no workers online, the job sits forever. Always pass 3+ fallbacks.
- **`###` separator is non-standard** — it is a Stable Horde convention for splitting positive and negative prompt. Leaving it in the prompt when switching to another backend (e.g. Replicate, ComfyUI) will poison results.
- **Do not retry submit on poll timeout** without user consent — you will double-bill the queue while the original job may still complete.
- **Image URL is ephemeral**: `generations[0].img` points to R2/Cloudflare storage with a finite TTL. Download and re-host if you need persistence.
