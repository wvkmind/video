# Database Schema Documentation

## Overview

This document describes the database schema for the AI Video Production System. The system uses TypeORM with support for both SQLite (development) and PostgreSQL (production).

## Tables

### 1. projects
Stores project-level information for video production tasks.

**Columns:**
- `id` (varchar, PK): Unique project identifier
- `name` (varchar): Project name
- `type` (varchar): Project type (e.g., "产品介绍", "剧情短片", "MV")
- `targetDuration` (integer): Target duration in seconds
- `targetStyle` (text, nullable): Target visual style
- `targetAudience` (text, nullable): Target audience description
- `notes` (text, nullable): Additional notes
- `status` (varchar): Project status (draft, in_progress, completed, archived)
- `createdAt` (datetime): Creation timestamp
- `updatedAt` (datetime): Last update timestamp

**Relations:**
- One-to-One with `stories`
- One-to-Many with `scenes`, `shots`, `timelines`, `character_presets`

### 2. stories
Stores story outlines for projects.

**Columns:**
- `id` (varchar, PK): Unique story identifier
- `projectId` (varchar, FK): Reference to project
- `hook` (text, nullable): Opening hook
- `middleStructure` (text, nullable): Middle structure
- `ending` (text, nullable): Ending
- `version` (integer): Version number
- `createdAt` (datetime): Creation timestamp
- `updatedAt` (datetime): Last update timestamp

**Foreign Keys:**
- `projectId` → `projects(id)` ON DELETE CASCADE

### 3. scenes
Stores scene information within projects.

**Columns:**
- `id` (varchar, PK): Unique scene identifier
- `projectId` (varchar, FK): Reference to project
- `sceneNumber` (integer): Scene sequence number
- `title` (varchar): Scene title
- `description` (text, nullable): Scene description
- `estimatedDuration` (integer): Estimated duration in seconds
- `voiceoverText` (text, nullable): Voiceover text
- `dialogueText` (text, nullable): Dialogue text
- `notes` (text, nullable): Additional notes
- `version` (integer): Version number
- `createdAt` (datetime): Creation timestamp
- `updatedAt` (datetime): Last update timestamp

**Foreign Keys:**
- `projectId` → `projects(id)` ON DELETE CASCADE

### 4. shots
Stores shot (镜头) information with detailed visual elements.

**Columns:**
- `id` (varchar, PK): Unique shot identifier
- `projectId` (varchar, FK): Reference to project
- `sceneId` (varchar, FK): Reference to scene
- `shotId` (varchar): Shot ID (e.g., "S1-01")
- `sequenceNumber` (integer): Sequence number within project
- `duration` (float): Duration in seconds
- `shotType` (varchar): Shot type (wide, medium, closeup, transition)
- `description` (text, nullable): Shot description
- `environment` (text, nullable): Environment description
- `subject` (text, nullable): Subject description
- `action` (text, nullable): Action description
- `cameraMovement` (text, nullable): Camera movement description
- `lighting` (text, nullable): Lighting description
- `style` (text, nullable): Style tags
- `previousShotId` (varchar, nullable): Previous shot ID for transitions
- `nextShotId` (varchar, nullable): Next shot ID for transitions
- `transitionType` (varchar): Transition type (cut, dissolve, motion)
- `useLastFrameAsFirst` (boolean): Whether to use previous shot's last frame as first frame
- `relatedVoiceover` (text, nullable): Related voiceover text
- `importance` (varchar): Importance level (high, medium, low)
- `createdAt` (datetime): Creation timestamp
- `updatedAt` (datetime): Last update timestamp

**Foreign Keys:**
- `projectId` → `projects(id)` ON DELETE CASCADE
- `sceneId` → `scenes(id)` ON DELETE CASCADE

**Indexes:**
- `IDX_shots_projectId_sequenceNumber`: (projectId, sequenceNumber)
- `IDX_shots_sceneId_sequenceNumber`: (sceneId, sequenceNumber)

### 5. keyframes
Stores generated keyframe images for shots.

**Columns:**
- `id` (varchar, PK): Unique keyframe identifier
- `shotId` (varchar, FK): Reference to shot
- `version` (integer): Version number
- `prompt` (text): Generation prompt
- `negativePrompt` (text, nullable): Negative prompt
- `workflowName` (varchar): ComfyUI workflow name
- `steps` (integer): Sampling steps
- `cfg` (float): CFG scale
- `sampler` (varchar): Sampler name
- `width` (integer): Image width
- `height` (integer): Image height
- `seed` (bigint): Random seed
- `imagePath` (varchar): Path to generated image
- `isSelected` (boolean): Whether this is the selected keyframe
- `createdAt` (datetime): Creation timestamp

**Foreign Keys:**
- `shotId` → `shots(id)` ON DELETE CASCADE

**Indexes:**
- `IDX_keyframes_shotId_version`: (shotId, version)

### 6. clips
Stores generated video clips for shots.

**Columns:**
- `id` (varchar, PK): Unique clip identifier
- `shotId` (varchar, FK): Reference to shot
- `version` (integer): Version number
- `inputMode` (varchar): Input mode (image_to_video, text_to_video)
- `keyframeId` (varchar, nullable): Reference to keyframe (if image_to_video)
- `prompt` (text): Generation prompt
- `workflowName` (varchar): ComfyUI workflow name
- `duration` (float): Duration in seconds
- `fps` (integer): Frames per second
- `width` (integer): Video width
- `height` (integer): Video height
- `steps` (integer): Sampling steps
- `guidance` (float): Guidance scale
- `cfg` (float): CFG scale
- `seed` (bigint): Random seed
- `useLastFrameReference` (boolean): Whether to use previous clip's last frame
- `referenceClipId` (varchar, nullable): Reference clip ID
- `referenceFrameNumber` (integer, nullable): Reference frame number
- `mode` (varchar): Generation mode (demo, production)
- `videoPath` (varchar, nullable): Path to generated video
- `status` (varchar): Generation status (pending, processing, completed, failed)
- `comfyuiTaskId` (varchar, nullable): ComfyUI task ID
- `isSelected` (boolean): Whether this is the selected clip
- `createdAt` (datetime): Creation timestamp
- `completedAt` (datetime, nullable): Completion timestamp

**Foreign Keys:**
- `shotId` → `shots(id)` ON DELETE CASCADE

**Indexes:**
- `IDX_clips_shotId_version`: (shotId, version)

### 7. timelines
Stores timeline configurations for video editing.

**Columns:**
- `id` (varchar, PK): Unique timeline identifier
- `projectId` (varchar, FK): Reference to project
- `version` (integer): Version number
- `versionName` (varchar, nullable): Version name
- `tracks` (json): Timeline tracks configuration (video and audio tracks)
- `voiceoverAudioPath` (varchar, nullable): Path to voiceover audio
- `bgmAudioPath` (varchar, nullable): Path to background music
- `createdAt` (datetime): Creation timestamp
- `updatedAt` (datetime): Last update timestamp

**Foreign Keys:**
- `projectId` → `projects(id)` ON DELETE CASCADE

**Indexes:**
- `IDX_timelines_projectId_version`: (projectId, version)

### 8. workflow_configs
Stores ComfyUI workflow configurations.

**Columns:**
- `id` (varchar, PK): Unique workflow identifier
- `name` (varchar, unique): Workflow name
- `displayName` (varchar): Display name
- `type` (varchar): Workflow type (text_to_image, image_to_video, text_to_video)
- `workflowJSON` (json): Complete ComfyUI workflow JSON
- `parameters` (json): Configurable parameters
- `isActive` (boolean): Whether workflow is active
- `createdAt` (datetime): Creation timestamp
- `updatedAt` (datetime): Last update timestamp

### 9. character_presets
Stores character presets for consistent character generation.

**Columns:**
- `id` (varchar, PK): Unique character preset identifier
- `projectId` (varchar, FK): Reference to project
- `name` (varchar): Character name
- `description` (text): Character description
- `referenceImagePath` (varchar, nullable): Path to reference image
- `loraName` (varchar, nullable): LoRA model name
- `promptTemplate` (text, nullable): Prompt template
- `createdAt` (datetime): Creation timestamp
- `updatedAt` (datetime): Last update timestamp

**Foreign Keys:**
- `projectId` → `projects(id)` ON DELETE CASCADE

**Indexes:**
- `IDX_character_presets_projectId`: (projectId)

### 10. style_presets
Stores style presets for consistent visual style.

**Columns:**
- `id` (varchar, PK): Unique style preset identifier
- `projectId` (varchar, nullable): Reference to project (null for global presets)
- `name` (varchar): Style name
- `promptPrefix` (text, nullable): Prompt prefix
- `promptSuffix` (text, nullable): Prompt suffix
- `negativePrompt` (text, nullable): Negative prompt
- `defaultSteps` (integer, nullable): Default sampling steps
- `defaultCfg` (float, nullable): Default CFG scale
- `defaultSampler` (varchar, nullable): Default sampler
- `createdAt` (datetime): Creation timestamp
- `updatedAt` (datetime): Last update timestamp

**Indexes:**
- `IDX_style_presets_projectId`: (projectId)

### 11. system_configs
Stores system-wide configuration.

**Columns:**
- `id` (varchar, PK): Configuration identifier (typically 'default')
- `comfyuiBaseUrl` (varchar): ComfyUI base URL
- `comfyuiTimeout` (integer): ComfyUI timeout in seconds
- `poeApiKey` (varchar, nullable): Poe API key
- `poeModel` (varchar): Poe model name
- `poeApiUrl` (varchar): Poe API URL
- `storageBasePath` (varchar): File storage base path
- `ffmpegPath` (varchar): FFmpeg executable path
- `updatedAt` (datetime): Last update timestamp

## Entity Relationships

```
projects (1) ←→ (1) stories
projects (1) ←→ (n) scenes
projects (1) ←→ (n) shots
projects (1) ←→ (n) timelines
projects (1) ←→ (n) character_presets

scenes (1) ←→ (n) shots

shots (1) ←→ (n) keyframes
shots (1) ←→ (n) clips
```

## Cascade Delete Behavior

All foreign key relationships use `ON DELETE CASCADE`, meaning:
- Deleting a project will delete all associated stories, scenes, shots, timelines, and character presets
- Deleting a scene will delete all associated shots
- Deleting a shot will delete all associated keyframes and clips

## Indexes

Indexes are created on frequently queried columns to improve performance:
- Shot sequence numbers (by project and by scene)
- Keyframe and clip versions (by shot)
- Timeline versions (by project)
- Character presets (by project)
- Style presets (by project)

## Migration Scripts

### Running Migrations

```bash
npm run migration:run
```

### Verifying Schema

```bash
npm run schema:verify
```

## Database Configuration

The system supports two database types:

### SQLite (Development)
- Database file: `./dev.sqlite`
- Auto-synchronization enabled
- Suitable for local development

### PostgreSQL (Production)
- Configurable via environment variables
- Manual migrations recommended
- Suitable for production deployment

See `.env.example` for configuration options.
