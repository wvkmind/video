# LLM API Reference

Quick reference guide for the LLM-assisted content generation endpoints.

## Prerequisites

Set your Poe API key in the environment or system configuration:

```bash
# In .env file
POE_API_KEY=your-api-key-here
```

Or via API:
```bash
PUT /api/system/config
{
  "poeApiKey": "your-api-key-here"
}
```

## Endpoints

### 1. Generate Story Outline

Generate a complete story outline from a project description.

**Endpoint:** `POST /api/projects/:id/generate-story-outline`

**Request:**
```json
{
  "projectDescription": "A 60-second product video introducing our new AI-powered camera"
}
```

**Response:**
```json
{
  "story": {
    "id": "story-uuid",
    "projectId": "project-uuid",
    "hook": "Imagine capturing perfect moments without thinking about settings...",
    "middleStructure": "Our AI camera analyzes the scene in real-time...",
    "ending": "Experience photography reimagined. Available now.",
    "version": 1
  },
  "generated": {
    "hook": "Imagine capturing perfect moments without thinking about settings...",
    "middleStructure": "Our AI camera analyzes the scene in real-time...",
    "ending": "Experience photography reimagined. Available now."
  }
}
```

**Use Case:** When starting a new project, generate a story structure to guide content creation.

---

### 2. Generate Scene Script

Generate voiceover script for a specific scene based on the story outline.

**Endpoint:** `POST /api/scenes/:id/generate-script`

**Request:** No body required (uses scene description and story outline from database)

**Response:**
```json
{
  "scene": {
    "id": "scene-uuid",
    "title": "Product Introduction",
    "voiceoverText": "In a world where every moment matters, our AI-powered camera ensures you never miss the perfect shot. With intelligent scene recognition and automatic adjustments, photography has never been easier.",
    "version": 2
  },
  "generatedScript": "In a world where every moment matters, our AI-powered camera ensures you never miss the perfect shot. With intelligent scene recognition and automatic adjustments, photography has never been easier."
}
```

**Use Case:** Generate natural voiceover narration for each scene that aligns with the overall story.

---

### 3. Optimize Prompt

Convert shot descriptions into optimized English prompts for AI image generation.

**Endpoint:** `POST /api/shots/:id/optimize-prompt`

**Request:** No body required (uses shot fields from database)

**Response:**
```json
{
  "shotId": "shot-uuid",
  "originalDescription": {
    "environment": "现代办公室，白天，落地窗",
    "subject": "年轻女性摄影师",
    "action": "查看相机屏幕，微笑",
    "cameraMovement": "缓慢推进",
    "lighting": "自然光，柔和",
    "style": "电影感，浅景深"
  },
  "optimizedPrompt": "modern office interior, daytime, floor-to-ceiling windows, young female photographer looking at camera screen with smile, slow push-in camera movement, natural soft lighting, cinematic style, shallow depth of field, professional photography, high quality, detailed"
}
```

**Use Case:** Convert Chinese shot descriptions into English prompts optimized for Stable Diffusion/ComfyUI.

---

### 4. Compress Voiceover

Compress voiceover text to fit a target duration while maintaining the key message.

**Endpoint:** `POST /api/scenes/:id/compress-voiceover`

**Request:**
```json
{
  "targetDuration": 10
}
```

**Response:**
```json
{
  "scene": {
    "id": "scene-uuid",
    "voiceoverText": "Our AI camera captures perfect moments with intelligent scene recognition.",
    "version": 3
  },
  "originalText": "In a world where every moment matters, our AI-powered camera ensures you never miss the perfect shot. With intelligent scene recognition and automatic adjustments, photography has never been easier.",
  "compressedText": "Our AI camera captures perfect moments with intelligent scene recognition.",
  "originalWords": 28,
  "compressedWords": 10,
  "targetDuration": 10
}
```

**Use Case:** Shorten voiceover text to fit scene duration (assumes ~2.5 words per second).

---

## System Configuration

### Get Configuration

**Endpoint:** `GET /api/system/config`

**Response:**
```json
{
  "id": "config-uuid",
  "comfyuiBaseUrl": "http://localhost:8188",
  "comfyuiTimeout": 300,
  "poeApiKey": "***key4",
  "poeModel": "gpt-5.1",
  "poeApiUrl": "https://api.poe.com/v1/chat/completions",
  "storageBasePath": "./storage",
  "ffmpegPath": "ffmpeg",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

Note: API key is masked for security.

---

### Update Configuration

**Endpoint:** `PUT /api/system/config`

**Request:**
```json
{
  "poeApiKey": "new-api-key",
  "poeModel": "gpt-4",
  "comfyuiBaseUrl": "http://192.168.1.100:8188"
}
```

**Response:** Same as GET (with updated values)

---

### Validate All Configurations

**Endpoint:** `POST /api/system/config/validate`

**Response:**
```json
{
  "valid": true,
  "results": {
    "comfyui": {
      "valid": true,
      "message": "ComfyUI connection successful"
    },
    "poeApi": {
      "valid": true,
      "message": "Poe API connection successful"
    },
    "ffmpeg": {
      "valid": true,
      "message": "FFmpeg found and working"
    },
    "storage": {
      "valid": true,
      "message": "Storage path is accessible and writable"
    }
  }
}
```

---

### Validate Specific Service

**ComfyUI:** `POST /api/system/config/validate/comfyui`
```json
{
  "baseUrl": "http://localhost:8188"  // optional, tests current config if omitted
}
```

**Poe API:** `POST /api/system/config/validate/poe`
```json
{
  "apiKey": "test-key",  // optional
  "apiUrl": "https://api.poe.com/v1/chat/completions"  // optional
}
```

**FFmpeg:** `POST /api/system/config/validate/ffmpeg`
```json
{
  "ffmpegPath": "/usr/local/bin/ffmpeg"  // optional
}
```

**Storage:** `POST /api/system/config/validate/storage`
```json
{
  "storagePath": "/custom/storage"  // optional
}
```

---

## Error Responses

### API Key Not Configured
```json
{
  "error": {
    "code": "LLM_SERVICE_UNAVAILABLE",
    "message": "POE_API_KEY is not configured. Please set it in environment variables or system config."
  },
  "timestamp": "2024-01-15T10:30:00Z",
  "path": "/api/projects/123/generate-story-outline"
}
```

### Invalid API Key
```json
{
  "error": {
    "code": "LLM_SERVICE_UNAVAILABLE",
    "message": "Invalid API key. Please check your POE_API_KEY configuration."
  },
  "timestamp": "2024-01-15T10:30:00Z",
  "path": "/api/scenes/456/generate-script"
}
```

### Resource Not Found
```json
{
  "error": {
    "code": "SCENE_NOT_FOUND",
    "message": "Scene 456 not found"
  },
  "timestamp": "2024-01-15T10:30:00Z",
  "path": "/api/scenes/456/generate-script"
}
```

### Validation Error
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Project description is required"
  },
  "timestamp": "2024-01-15T10:30:00Z",
  "path": "/api/projects/123/generate-story-outline"
}
```

---

## Rate Limiting & Retries

The LLM service automatically handles transient errors:
- **Retries:** Up to 3 attempts for network errors and 5xx responses
- **Backoff:** Exponential (1s, 2s, 4s)
- **No Retry:** Authentication errors (401/403) and bad requests (400)

---

## Tips

1. **Test Configuration First:** Use validation endpoints before generating content
2. **Provide Context:** Better project descriptions lead to better story outlines
3. **Iterate:** Generated content is a starting point - refine as needed
4. **Monitor Usage:** LLM API calls consume credits - use wisely
5. **Fallback:** All LLM features are optional - manual editing always works

---

## Example Workflow

```bash
# 1. Configure API key
curl -X PUT http://localhost:5000/api/system/config \
  -H "Content-Type: application/json" \
  -d '{"poeApiKey": "your-key"}'

# 2. Validate configuration
curl -X POST http://localhost:5000/api/system/config/validate

# 3. Generate story outline
curl -X POST http://localhost:5000/api/projects/123/generate-story-outline \
  -H "Content-Type: application/json" \
  -d '{"projectDescription": "A product video for AI camera"}'

# 4. Generate scene script
curl -X POST http://localhost:5000/api/scenes/456/generate-script

# 5. Optimize shot prompt
curl -X POST http://localhost:5000/api/shots/789/optimize-prompt

# 6. Compress voiceover
curl -X POST http://localhost:5000/api/scenes/456/compress-voiceover \
  -H "Content-Type: application/json" \
  -d '{"targetDuration": 10}'
```
