---
version: 0.1.0-draft
name: fastapi-plugin-router-system
summary: Realtime-conversation plugin architecture over FastAPI routers, where each plugin consumes TranscriptSegment lists, returns structured EndpointResponse, and is registered via a simple per-conversation-app allowlist.
category: plugin-architecture
confidence: medium
tags: [fastapi, plugins, transcript-segment, langchain, pydantic-v1, realtime-hooks]
source_type: extracted-from-git
source_url: https://github.com/BasedHardware/omi.git
source_ref: main
source_commit: 1c310f7fc4c37acf7e1bedb014e3a4adfd56546e
source_project: omi
imported_at: 2026-04-18T00:00:00Z
---

# FastAPI Realtime Plugin System

Plugin architecture where extensibility is done with **standalone FastAPI apps** (`plugins/advanced/realtime.py`, `plugins/basic/...`) that the core backend posts transcript segments to — not with in-process hooks or dynamic imports. Each plugin is an HTTP endpoint that takes `RealtimePluginRequest` and returns `EndpointResponse`.

## Contract

```python
# plugins/models.py
class RealtimePluginRequest(BaseModel):
    uid: str
    session_id: str
    segments: List[TranscriptSegment]

class TranscriptSegment(BaseModel):
    text: str
    speaker: Optional[str] = 'SPEAKER_00'
    speaker_id: Optional[int] = None
    is_user: bool
    person_id: Optional[str] = None
    start: float
    end: float

    @staticmethod
    def segments_as_string(segments, include_timestamps=False, user_name=None) -> str: ...

    @staticmethod
    def combine_segments(segments, new_segments, delta_seconds=0) -> List['TranscriptSegment']: ...

class EndpointResponse(BaseModel):
    message: str  # may be empty → no side effect
```

`segments_as_string` and `combine_segments` are the heart of it: plugins receive clean, speaker-labelled transcripts without having to re-implement segment merging.

## Plugin shape

```python
router = APIRouter()

@router.post('/news-checker', tags=['advanced', 'realtime'], response_model=EndpointResponse)
def news_checker_endpoint(uid: str, data: RealtimePluginRequest):
    session_id = 'news-checker-' + data.session_id
    clean_all_transcripts_except(uid, session_id)
    transcript = append_segment_to_transcript(uid, session_id, data.segments)
    message = news_checker(transcript)
    if message:
        remove_transcript(uid, session_id)
    return {'message': message}
```

- Per-plugin session ID (`'news-checker-' + data.session_id`) isolates plugin state so two plugins never fight over the same key.
- Plugins own their own storage (in-process dict, Redis, whatever fits); the core backend gives them segments + uid, nothing more.
- `clean_all_transcripts_except` guarantees a fresh session if the user started a new conversation — no stale context leaks.

## Registration

On the backend side, plugins register themselves with per-conversation allowlists:

```python
get_conversation_summary_app_ids(uid, conversation_id) -> List[str]
add_conversation_summary_app_id(uid, conversation_id, app_id)
```

`add_conversation_summary_app_id` enables a plugin for a conversation; the realtime loop fans out segments only to enabled apps. This keeps plugin CPU cost proportional to opt-in, not to the full plugin catalog.

## Why HTTP instead of in-process?

- **Isolation** — a plugin bug crashes that plugin's pod, not the main transcription loop.
- **Language-agnostic** — third-party devs can ship plugins in any language that can accept JSON.
- **Horizontal scale** — fan out to N plugin pods over HTTP; can't fan out in-process.
- **Observability** — every plugin call is a traced HTTP span.

## Evidence in source

- `plugins/advanced/realtime.py` — `news_checker`, `emotional_support` realtime plugins, Groq + OpenAI clients
- `plugins/models.py` — `RealtimePluginRequest`, `TranscriptSegment`, `EndpointResponse`
- `backend/routers/apps.py` — `get_conversation_summary_app_ids`, `add_conversation_summary_app_id`

## Reusability

Any realtime-streaming product (call-center analytics, live-ops tools, meeting assistants) can adopt: core publishes typed events, plugins subscribe via HTTP with a minimal Pydantic contract. The segment-merge utilities (`combine_segments`, `segments_as_string`) are portable primitives for anything dealing with speaker-labelled text streams.
