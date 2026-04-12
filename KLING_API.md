# Kling AI — Complete API Reference

> **Sources**: Official Kling skill (klingai-1.1.0), mcp-kling repo, our server.js implementation, web search.  
> **Updated**: 2026-04-11  
> **API base (Global/Europe)**: `https://api-singapore.klingai.com`  
> **API base (CN)**: `https://api-beijing.klingai.com`

---

## 1. Authentication

All business API calls (`/v1/...`) require a `Bearer` JWT in the `Authorization` header.

### JWT Format

```
Algorithm : HS256
typ        : JWT

Payload:
  iss  → your Access Key ID
  exp  → Math.floor(Date.now() / 1000) + 1800   // +30 min
  nbf  → Math.floor(Date.now() / 1000) - 5       // -5 sec (clock skew)

Signed with: your Secret Access Key
```

### Node.js example (zero deps, using `jose`)

```js
import { SignJWT } from 'jose';
const secret = new TextEncoder().encode(SECRET_KEY);
const token = await new SignJWT({ iss: ACCESS_KEY })
  .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
  .setIssuedAt()
  .setExpirationTime('30m')
  .sign(secret);
// Header: Authorization: Bearer <token>
```

### Our server implementation (pure crypto)

```js
import { createHmac } from 'node:crypto';
function klingJWT() {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = { iss: ACCESS_KEY, exp: now + 1800, nbf: now - 5 };
  const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
  const unsigned = `${b64(header)}.${b64(payload)}`;
  const sig = createHmac('sha256', SECRET_KEY).update(unsigned).digest('base64url');
  return `${unsigned}.${sig}`;
}
```

### Credentials file location

```
~/.config/kling/.credentials
```
Fields: `access_key_id`, `secret_access_key`

### Error codes for auth failures

| HTTP | code | Meaning |
|------|------|---------|
| 401 | 1000 | Signature invalid — re-generate JWT |
| 401 | 1002 | Access key doesn't exist |

---

## 2. General Response Envelope

All responses wrap data in this envelope:

```json
{
  "code": 0,
  "message": "string",
  "request_id": "string",
  "data": { ... }
}
```

`code: 0` or `code: 200` = success. Any other value = error.

### ⚠️ Big Integer Warning

Kling `task_id` values are **18-digit integers** that exceed JavaScript's `Number.MAX_SAFE_INTEGER` (2^53 - 1). `JSON.parse()` silently corrupts them. **Always sanitize before parsing**:

```js
function protectBigInts(text) {
  return String(text || '').replace(
    /"(task_id|element_id|elementId|taskId)":\s*(\d{15,})/g,
    '"$1":"$2"'
  );
}
// Usage: JSON.parse(protectBigInts(rawResponseText))
```

This is the **root cause** of 404 errors when polling task status — the task_id gets corrupted in the browser before being sent to the poll endpoint.

---

## 3. Task Lifecycle

All generation tasks follow the same pattern:

1. **Submit** → `POST /v1/.../endpoint` → returns `{ task_id, task_status: "submitted" }`
2. **Poll** → `GET /v1/.../endpoint/{task_id}` → check `task_status`
3. **Result** → `task_status: "succeed"` → read URLs from `task_result`

### Task Status Values

| Status | Meaning |
|--------|---------|
| `submitted` | Queued |
| `processing` | Running |
| `succeed` | Done — read `task_result` |
| `failed` | Error — read `task_status_msg` |

### Poll Response Structure

```json
{
  "code": 0,
  "data": {
    "task_id": "string",
    "task_status": "succeed",
    "task_status_msg": "string",
    "created_at": 1722769557708,
    "updated_at": 1722769557708,
    "task_result": { ... }
  }
}
```

---

## 4. Video Generation

### 4-1. Text-to-Video

```
POST /v1/videos/text2video
GET  /v1/videos/text2video/{task_id}        ← poll
GET  /v1/videos/text2video?pageNum=1&pageSize=30  ← list
```

**Request body:**

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `prompt` | string | ✓ | — | Video description |
| `negative_prompt` | string | — | `""` | What to avoid |
| `model_name` | string | — | `kling-v1` | See model table |
| `aspect_ratio` | string | — | `16:9` | `16:9`, `9:16`, `1:1` |
| `duration` | string | — | `"5"` | `"5"` or `"10"` |
| `mode` | string | — | `standard` | `standard` or `professional` |
| `cfg_scale` | float | — | `0.5` | 0–1 (creativity vs prompt adherence) |
| `camera_control` | object | — | — | V1 only; see camera section |
| `callback_url` | string | — | `""` | Webhook URL |

**task_result:**
```json
{
  "videos": [{ "id": "string", "url": "string", "duration": "5", "aspect_ratio": "16:9" }]
}
```

---

### 4-2. Image-to-Video

```
POST /v1/videos/image2video
GET  /v1/videos/image2video/{task_id}
GET  /v1/videos/image2video?pageNum=1&pageSize=30
```

**Additional fields vs T2V:**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `image` | string | ✓ | URL or base64 of start frame |
| `image_tail` | string | — | URL or base64 of end frame (for first/last frame mode) |

---

### 4-3. Omni-Video

```
POST /v1/videos/omni-video
GET  /v1/videos/omni-video/{task_id}
GET  /v1/videos/omni-video?pageNum=1&pageSize=30
```

**Request body:**

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `model_name` | string | — | `kling-video-o1` | `kling-video-o1` or `kling-v3-omni` |
| `multi_shot` | boolean | — | `false` | Enable multi-shot mode. When `true`: `prompt` is invalid; start/end frames not supported |
| `shot_type` | string | Req. when `multi_shot=true` | — | `customize` or `intelligence` |
| `prompt` | string | Req. when `multi_shot=false` or `shot_type=intelligence` | — | Max 2500 chars. Use `<<<image_1>>>`, `<<<element_1>>>`, `<<<video_1>>>` to reference inputs |
| `multi_prompt` | array | Req. when `multi_shot=true` + `shot_type=customize` | — | Per-shot prompts; see below |
| `image_list` | array | — | — | Reference images; see below |
| `element_list` | array | — | — | `[{ "element_id": long }]` — subjects from element library |
| `video_list` | array | — | — | Reference video(s); see below |
| `sound` | string | — | `off` | `on` or `off`. When video_list is provided, can only be `off` |
| `mode` | string | — | `pro` | `std` (standard) or `pro` (professional/high quality) |
| `aspect_ratio` | string | Req. when no first-frame / no video edit | — | `16:9`, `9:16`, `1:1` |
| `duration` | string | — | `"5"` | `"3"–"15"`. Invalid when video editing (`refer_type=base`) — inherits input video duration |
| `watermark_info` | object | — | — | `{ "enabled": boolean }` |
| `callback_url` | string | — | `""` | Webhook on task status change |
| `external_task_id` | string | — | — | Custom task ID (unique per account); can be used in GET path instead of `task_id` |

**`multi_prompt` item:**
```json
{ "index": 1, "prompt": "string (max 512 chars)", "duration": "5" }
```
- Max 6 shots (min 1). Sum of all shot durations must equal the total `duration`. Each shot duration ≥ 1.

**`image_list` item:**
```json
{ "image_url": "string (URL or base64)", "type": "first_frame" }
```
- `type` is optional: `first_frame` or `end_frame`. Omit if not using as start/end frame.
- End frame requires a first frame. Only setting end frame alone is not supported.
- When using first/last frame: video editing functions cannot be combined.
- Formats: JPG/JPEG/PNG, ≤10MB, min 300px, aspect ratio 1:2.5–2.5:1.
- Quantity limits depend on element types and whether a reference video is included (max 4–7 images; see official docs).

**`video_list` item:**
```json
{ "video_url": "string", "refer_type": "base", "keep_original_sound": "yes" }
```
- `refer_type`: `base` (video editing/transformation) or `feature` (style/camera/action reference, next/prev shot)
- `keep_original_sound`: `yes` or `no`
- Format: MP4/MOV only, ≥3s, 720–2160px, 24–60fps (output is 24fps), max 1 video, ≤200MB
- When `refer_type=base` is used: `aspect_ratio` and `duration` are ignored; output matches input video duration; `sound` must be `off`

**Modes summary:**

| Mode | `multi_shot` | `shot_type` | `prompt` | `multi_prompt` |
|------|-------------|------------|---------|----------------|
| Single shot (T2V/I2V) | `false` | N/A | ✓ | N/A |
| Multi-shot auto | `true` | `intelligence` | ✓ (one overall prompt) | N/A |
| Multi-shot manual | `true` | `customize` | empty `""` | ✓ |

**Duration support:**
- T2V / I2V (no first/last frame): 3–10s
- Video editing (`refer_type=base`): inherits input video duration, param ignored
- Other cases (image+element, video+`feature`): 3–10s
- Multi-shot `customize`: up to 15s total (sum of shot durations)

> ⚠️ Our single-shot path caps at `Math.min(15, ...)` — but the official spec says single-shot is 3–10s max. Multi-shot `kling-v3-omni` supports up to 15s. In practice the API may accept higher values silently, but stay within 3–10 for single-shot to be safe.

**Response (submit):**
```json
{
  "code": 0,
  "data": {
    "task_id": "string",
    "task_info": { "external_task_id": "string" },
    "task_status": "submitted",
    "created_at": 1722769557708,
    "updated_at": 1722769557708
  }
}
```

**Response (poll — succeed):**
```json
{
  "code": 0,
  "data": {
    "task_id": "string",
    "task_status": "succeed",
    "task_status_msg": "string",
    "task_info": { "external_task_id": "string" },
    "task_result": {
      "videos": [
        {
          "id": "string",
          "url": "string",
          "watermark_url": "string",
          "duration": "5"
        }
      ]
    },
    "watermark_info": { "enabled": false },
    "final_unit_deduction": "string",
    "created_at": 1722769557708,
    "updated_at": 1722769557708
  }
}
```

> ⚠️ Video URLs are anti-leech and **expire after 30 days**. Download and store locally.

**Usage examples:**

```bash
# Image/Element Reference
curl https://api-singapore.klingai.com/v1/videos/omni-video \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{
    "model_name": "kling-video-o1",
    "prompt": "<<<image_1>>> strolling through Tokyo, encountered <<<element_1>>> and <<<element_2>>>",
    "image_list": [{ "image_url": "https://..." }],
    "element_list": [{ "element_id": 12345 }, { "element_id": 67890 }],
    "mode": "pro", "aspect_ratio": "1:1", "duration": "7"
  }'

# Video Editing / Transformation (refer_type=base)
curl https://api-singapore.klingai.com/v1/videos/omni-video \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{
    "model_name": "kling-video-o1",
    "prompt": "Put the crown from <<<image_1>>> on the girl in <<<video_1>>>.",
    "image_list": [{ "image_url": "https://..." }],
    "video_list": [{ "video_url": "https://...", "refer_type": "base", "keep_original_sound": "yes" }],
    "mode": "pro"
  }'

# Multi-shot with per-shot prompts
curl https://api-singapore.klingai.com/v1/videos/omni-video \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{
    "model_name": "kling-v3-omni",
    "multi_shot": true, "shot_type": "customize", "prompt": "",
    "multi_prompt": [
      { "index": 1, "prompt": "Two friends talking under a streetlight at night.", "duration": "5" },
      { "index": 2, "prompt": "A runner sprinting through a forest, leaves flying.", "duration": "5" }
    ],
    "image_list": [{ "image_url": "https://..." }],
    "mode": "pro", "sound": "on", "aspect_ratio": "16:9", "duration": "10"
  }'

# Start & End Frames
curl https://api-singapore.klingai.com/v1/videos/omni-video \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{
    "model_name": "kling-video-o1",
    "prompt": "The person is dancing.",
    "image_list": [
      { "image_url": "https://...", "type": "first_frame" },
      { "image_url": "https://...", "type": "end_frame" }
    ],
    "mode": "pro"
  }'
```

---

### 4-4. Video Extension

```
POST /v1/video/extension
GET  /v1/video/extension/{task_id}
```

**Request body:**
```json
{
  "task_id": "string",    // ID of the video to extend
  "prompt": "string",
  "duration": "5",
  "mode": "standard",
  "model_name": "kling-v2-master"
}
```

---

### Camera Control (T2V / I2V, V1 models only)

```json
{
  "camera_control": {
    "type": "simple",
    "config": {
      "horizontal": 0,   // [-10, 10]
      "vertical":   0,   // [-10, 10]
      "pan":        0,   // [-10, 10]
      "tilt":       0,   // [-10, 10]
      "roll":       0,   // [-10, 10]
      "zoom":       5    // [-10, 10]
    }
  }
}
```

Preset types: `simple`, `down_back`, `forward_up`, `right_turn_forward`, `left_turn_forward`

---

### Model Name Reference

| Model | Endpoint | Notes |
|-------|----------|-------|
| `kling-v1` | T2V / I2V | Legacy |
| `kling-v1.5` | T2V / I2V | |
| `kling-v1.6` | T2V / I2V | |
| `kling-v2-master` | T2V / I2V | |
| `kling-v3` | T2V / I2V | Current standard |
| `kling-v3-omni` | **Omni only** | Omni-video; supports multi-shot |
| `kling-video-o1` | **Omni only** | **Default** for `/v1/videos/omni-video`; higher quality |
| `kling-image-o1` | **Omni-image only** | `/v1/images/omni-image` |

> ⚠️ `kling-v3-omni` and `kling-video-o1` must go through `/v1/videos/omni-video`. Using them with `/v1/videos/text2video` or `/v1/videos/image2video` returns an error.

**Known differences between omni models:**
- `kling-video-o1`: Does NOT support start+end frame when more than 2 images in `image_list`; does NOT support `element_list` when using start/end frames; higher quality output
- `kling-v3-omni`: Supports up to 3 elements when using start/end frames; required for multi-shot (`multi_shot=true`)

---

## 5. Image Generation

### 5-1. Standard Image Generation

```
POST /v1/images/generations
GET  /v1/images/generations/{task_id}
```

**Request body:**

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `model_name` | string | `kling-v3` | |
| `prompt` | string | — | Required |
| `negative_prompt` | string | `""` | |
| `n` | int | `1` | 1–9 images |
| `aspect_ratio` | string | `16:9` | |
| `resolution` | string | `1k` | `1k`, `2k` |
| `image` | string | — | Base64 or URL for I2I |
| `callback_url` | string | `""` | |

**task_result:**
```json
{
  "images": [{ "url": "string" }]
}
```

---

### 5-2. Omni-Image (4K, series, subject)

```
POST /v1/images/omni-image
GET  /v1/images/omni-image/{task_id}
```

Use this endpoint when: `model_name` is `kling-v3-omni` or `kling-image-o1`, `resolution` is `4k`, `result_type` is `series`, or multiple `image_list` references.

**Request body:**

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `model_name` | string | `kling-v3-omni` | `kling-v3-omni` or `kling-image-o1` only |
| `prompt` | string | — | Required; use `<<<image_1>>>` to ref images |
| `resolution` | string | `1k` | `1k`, `2k`, `4k` |
| `aspect_ratio` | string | `auto` | |
| `result_type` | string | `single` | `single` or `series` |
| `series_amount` | int | `4` | 2–9; only when `result_type=series` |
| `n` | int | `1` | Only when `result_type=single` |
| `image_list` | array | — | `[{ "image": "<url>" }]`; max 10 total refs |
| `element_list` | array | — | `[{ "element_id": "string" }]` |
| `callback_url` | string | `""` | |

> Series (`result_type=series`) requires at least one `image_list` entry — T2I series is not supported.

**task_result:**
```json
{
  "images": [{ "url": "string" }],
  "series_images": [{ "url": "string" }]
}
```

---

## 6. Audio — TTS

```
POST /v1/audio/tts
GET  /v1/audio/tts/{task_id}
```

**Request body:**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `text` | string | ✓ | Up to 1000 characters (we enforce this limit) |
| `voice_id` | string | ✓ | From `/v1/videos/lip-sync/voices` |
| `voice_language` | string | — | `en` or `zh` (default: `en`) |
| `voice_speed` | float | — | 0.8–2.0 (default: `1.0`) |
| `callback_url` | string | — | |

**task_result:**
```json
{
  "audios": [
    {
      "id": "string",
      "url": "string",
      "duration": 3.5
    }
  ]
}
```

> The `audio.id` is the `audio_id` needed for advanced lip-sync step 3.

---

## 7. Voices

```
GET /v1/videos/lip-sync/voices?voice_language=en
GET /v1/videos/lip-sync/voices?voice_language=zh
```

> ⚠️ **`voice_language` is required.** Omitting it returns `400 Bad Request`. Fetch both languages and merge to get all voices.

**Response:**
```json
{
  "code": 0,
  "data": {
    "voices": [
      {
        "voice_id": "string",
        "voice_name": "string",
        "voice_language": "en",
        "voice_gender": "male",
        "voice_preview_url": "string"
      }
    ]
  }
}
```

**Example voice IDs** (from mcp-kling source):
- `male-magnetic` — Professional Male (EN)
- Other voices: fetch from the endpoint to get current list

---

## 8. Advanced Lip-Sync (3-Step Flow)

This is the **multi-character lipsync** flow. It supports per-face audio assignment.

### Step 1: Generate TTS Audio

For each character's dialogue, call `/v1/audio/tts` (see §6) and poll until `succeed`. Collect the `audio_id` from `task_result.audios[0].id`.

### Step 2: Identify Faces in Video

```
POST /v1/videos/identify-face
```

**Request body:**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `video_url` | string | One of | Public URL to generated video |
| `video_id` | string | One of | Kling video task result ID |

**Response** (synchronous — no polling needed):
```json
{
  "code": 0,
  "data": {
    "session_id": "string",
    "face_data": [
      {
        "face_id": "string",
        "face_image": "string (base64 or URL)",
        "start_time": 0.0,
        "end_time": 2.5
      }
    ]
  }
}
```

`face_id` values map to detected faces in the video. The order corresponds to visual prominence/appearance order.

### Step 3: Apply Per-Face Lipsync

```
POST /v1/videos/advanced-lip-sync
GET  /v1/videos/advanced-lip-sync/{task_id}
```

**Request body:**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `session_id` | string | ✓ | From step 2 |
| `face_choose` | array | ✓ | Per-face audio assignments |

**`face_choose` item:**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `face_id` | string | ✓ | From step 2 `face_data` |
| `audio_id` | string | ✓ | From step 1 TTS `task_result.audios[0].id` |
| `sound_start_time` | float | — | Audio clip start (seconds) |
| `sound_end_time` | float | — | Audio clip end (seconds) |
| `sound_insert_time` | float | — | Where in the video to insert (seconds) |

**Example request:**
```json
{
  "session_id": "sess_abc123",
  "face_choose": [
    {
      "face_id": "face_0",
      "audio_id": "audio_xyz",
      "sound_insert_time": 0.0
    },
    {
      "face_id": "face_1",
      "audio_id": "audio_def",
      "sound_insert_time": 3.2
    }
  ]
}
```

**task_result:**
```json
{
  "videos": [{ "id": "string", "url": "string", "duration": "10" }]
}
```

---

## 9. Legacy Lip-Sync (Simple, Single-Voice)

```
POST /v1/videos/lip-sync
GET  /v1/videos/lip-sync/{task_id}
```

The request is wrapped in an `input` object:

```json
{
  "input": {
    "video_url": "string",
    "mode": "text2video",
    "text": "string (max 120 chars)",
    "voice_id": "string",
    "voice_language": "en",
    "voice_speed": 1.0
  },
  "callback_url": ""
}
```

Or for audio-file mode:
```json
{
  "input": {
    "video_url": "string",
    "mode": "audio2video",
    "audio_type": "url",
    "audio_url": "string"
  }
}
```

| `mode` | Fields |
|--------|--------|
| `text2video` | `text` (max 120 chars), `voice_id`, `voice_language` (`zh`/`en`), `voice_speed` |
| `audio2video` | `audio_type` (`file`/`url`), `audio_file` (base64) or `audio_url` |

**Video constraints:** MP4/MOV, ≤100MB, 2–10s, 720p or 1080p only, dimensions 720–1920px.

---

## 10. Element / Custom Subject Management

```
POST /v1/general/advanced-custom-elements    ← create subject
GET  /v1/general/advanced-custom-elements/{task_id}  ← poll
GET  /v1/general/advanced-custom-elements?pageNum=1&pageSize=30  ← list
GET  /v1/general/advanced-presets-elements?pageNum=1&pageSize=30  ← presets
POST /v1/general/delete-elements             ← delete
```

### Create Subject

```json
{
  "element_name": "string (≤20 chars)",
  "element_description": "string (≤100 chars)",
  "reference_type": "image_refer",
  "element_image_list": {
    "frontal_image": { "image_url": "string or base64" },
    "refer_images": [{ "image_url": "string or base64" }]
  },
  "tag_list": [{ "tag_id": "o_102" }],
  "callback_url": ""
}
```

Or video-based:
```json
{
  "reference_type": "video_refer",
  "element_video_list": {
    "refer_videos": [{ "video_url": "string or base64" }]
  },
  "element_voice_id": "optional-voice-id"
}
```

### Delete Subject

```json
{ "element_id": "string" }
```

### Use Subject in Generation

Add to omni-video or omni-image payload:
```json
{
  "element_list": [{ "element_id": "your_element_id" }]
}
```

Reference in prompt with: `<<<element_1>>>` (for first element in the list)

---

## 11. Video Effects

```
POST /v1/videos/effects
GET  /v1/videos/effects/{task_id}
```

```json
{
  "input": {
    "image_urls": ["string"],
    "effect_scene": "hug",
    "duration": "5",
    "model_name": "kling-v2-master"
  }
}
```

Effect scenes:
- `hug`, `kiss`, `heart_gesture` — dual-character effects (requires 2 images)
- `squish`, `expansion`, `fuzzyfuzzy`, `bloombloom`, `dizzydizzy` — single image

---

## 12. Virtual Try-On

```
POST /v1/videos/kolors-virtual-try-on
GET  /v1/videos/kolors-virtual-try-on/{task_id}
```

```json
{
  "model_name": "kolors-virtual-try-on-v1.5",
  "human_image": "string (URL or base64)",
  "cloth_image": "string (URL or base64)"
}
```

---

## 13. Account

```
GET /account/costs
```

Returns resource packages, remaining credits, expiry dates.

---

## 14. Our Server Proxy Endpoints

All calls go through our Express server at `/api/kling/...` which handles JWT generation.

| Our endpoint | Kling API | Method |
|-------------|-----------|--------|
| `POST /api/kling/video` | `/v1/videos/omni-video` | Submit T2V/I2V |
| `GET /api/kling/video/:taskId` | `/v1/videos/omni-video/{id}` | Poll |
| `GET /api/kling/voices` | `/v1/videos/lip-sync/voices?voice_language=en+zh` | List voices (merged) |
| `POST /api/kling/tts` | `/v1/audio/tts` | Generate TTS audio |
| `GET /api/kling/tts/:taskId` | `/v1/audio/tts/{id}` | Poll TTS |
| `POST /api/kling/identify-face` | `/v1/videos/identify-face` | Get faces + session_id |
| `POST /api/kling/advanced-lipsync` | `/v1/videos/advanced-lip-sync` | Per-face lipsync |
| `GET /api/kling/advanced-lipsync/:taskId` | `/v1/videos/advanced-lip-sync/{id}` | Poll |
| `POST /api/kling/lipsync` | `/v1/videos/lip-sync` | Legacy single-voice |
| `GET /api/kling/lipsync/:taskId` | `/v1/videos/lip-sync/{id}` | Legacy poll |

All proxy endpoints apply `protectBigInts()` before forwarding the response to the browser.

---

## 15. Known Gotchas & Bugs

### Big Integer Corruption (Critical)
`task_id` is 18 digits → exceeds `Number.MAX_SAFE_INTEGER`. `JSON.parse()` corrupts it silently. **Always use `protectBigInts()` on raw response text before parsing.** The server does this, but if you ever parse Kling JSON on the client without going through the proxy, you must handle this too.

### Voices endpoint requires `voice_language` param
`GET /v1/videos/lip-sync/voices` without `?voice_language=en` or `?voice_language=zh` returns `400`. We fetch both in parallel and merge.

### Legacy lip-sync text limit: 120 chars
`/v1/videos/lip-sync` (legacy) hard-caps text at 120 characters. The TTS endpoint (`/v1/audio/tts`) allows up to 1000 characters — use the advanced flow for longer dialogue.

### TTS audio_id ≠ task_id
When polling TTS, `task_result.audios[0].id` is the `audio_id` for advanced lipsync. It's different from the `task_id` used for polling.

### Face matching order
`/v1/videos/identify-face` returns faces in visual prominence order. We use `entityTags` order from shots to match speakers to face indices, which correlates better than dialogue-speaker order.

### Sound restrictions
The legacy lipsync endpoint restricts audio content (it generates the audio server-side). Background music, sound effects, and non-speech content may be rejected. Use the advanced flow (`/v1/audio/tts` + `/v1/videos/advanced-lip-sync`) for full control.

### Endpoint routing for models
- `kling-v3-omni` → **must** use `/v1/videos/omni-video`
- `kling-v3` → `/v1/videos/text2video` or `/v1/videos/image2video`
- Using an omni model on a T2V endpoint returns an error

### API regions
- Germany/Europe → `api-singapore.klingai.com` (Global)
- China → `api-beijing.klingai.com`
- Do not change region without user consent

### Bind flow (no Bearer)
Device binding uses `/console/api/auth/skill/init-sessions` and `/console/api/auth/skill/exchange` on the **console** base (`kling.ai` for Global), not the API base. These do not use Bearer tokens.
