# Keyframe Service Implementation

## Overview

This document describes the implementation of the KeyframeService and related API endpoints for generating and managing keyframes in the AI video production system.

## Components Implemented

### 1. KeyframeRepository (`backend/src/repositories/KeyframeRepository.ts`)

Repository for managing Keyframe entities with the following methods:

- `findByShotId(shotId)` - Find all keyframes for a specific shot
- `findSelectedByShotId(shotId)` - Find the selected keyframe for a shot
- `getLatestVersion(shotId)` - Get the latest version number for a shot
- `deselectAll(shotId)` - Deselect all keyframes for a shot
- `findByComfyUITaskId(taskId)` - Find keyframe by ComfyUI task ID

### 2. KeyframeService (`backend/src/services/KeyframeService.ts`)

Service layer implementing the core keyframe generation logic:

#### Key Methods:

**`generatePrompt(shotId: string): Promise<string>`**
- Requirement 4.2: Auto-generate English prompt from shot description fields
- Combines environment, subject, action, camera movement, lighting, and style fields
- Returns a comma-separated prompt string

**`generateKeyframes(shotId: string, params: KeyframeGenerationParams): Promise<GeneratedKeyframe[]>`**
- Requirement 4.4: Generate 4 candidate keyframe images via ComfyUI
- Supports shot transition continuity (Requirement 9.2)
- Automatically uses previous shot's keyframe as reference if `useLastFrameAsFirst` is enabled
- Creates keyframe records with pending status
- Submits generation tasks to ComfyUI
- Returns array of generated keyframe metadata

**`listKeyframes(shotId: string): Promise<Keyframe[]>`**
- Requirement 4.1: Display keyframe preview grid
- Returns all keyframes for a shot ordered by version and creation date

**`selectKeyframe(keyframeId: string): Promise<Keyframe>`**
- Requirement 4.5: Mark selected keyframe and deselect others
- Ensures only one keyframe is selected per shot

**`getKeyframeVersions(shotId: string): Promise<Keyframe[]>`**
- Requirement 4.6: Preserve version history with parameters and seeds
- Returns all keyframe versions for a shot

**`getKeyframeStatus(keyframeId: string): Promise<{status, progress?, error?}>`**
- Requirement 4.4: Query generation status
- Polls ComfyUI for task status
- Updates keyframe status in database

**`updateKeyframeFromTask(taskId: string): Promise<Keyframe | null>`**
- Requirement 4.8: Save image path, final prompt, and generation parameters
- Called when ComfyUI task completes
- Updates keyframe with generated image path

### 3. Keyframe Routes (`backend/src/routes/keyframeRoutes.ts`)

API endpoints for keyframe operations:

- `GET /api/shots/:id/keyframes` - Get all keyframes for a shot
- `GET /api/shots/:id/prompt` - Get auto-generated prompt for a shot
- `POST /api/shots/:id/generate-keyframes` - Generate keyframes for a shot
- `PUT /api/keyframes/:id/select` - Select a keyframe as the current one
- `GET /api/keyframes/:id/status` - Get keyframe generation status
- `GET /api/keyframes/:id` - Get a single keyframe by ID

### 4. Entity Updates

Updated `Keyframe` entity (`backend/src/entities/Keyframe.ts`) to include:
- `status` field: 'pending' | 'processing' | 'completed' | 'failed'
- `comfyuiTaskId` field: For tracking ComfyUI generation tasks

## Features

### Shot Transition Continuity

The service implements Requirement 9.2 for shot transition continuity:

- When generating keyframes for a shot with `useLastFrameAsFirst` enabled
- Automatically retrieves the selected keyframe from the previous shot
- Uses it as a reference image in the ComfyUI generation request
- Applies a reference strength of 0.7 by default

### Version Management

- Each keyframe generation creates a new version
- All versions are preserved with their parameters and seeds
- Users can view version history and compare results

### Asynchronous Generation

- Keyframes are generated asynchronously via ComfyUI
- Status can be polled using the status endpoint
- Supports generating 4 candidate images per request

## Integration Points

### ComfyUIAdapter

The KeyframeService integrates with ComfyUIAdapter for:
- Submitting generation tasks with workflow parameters
- Querying task status
- Retrieving generated image paths

### ShotRepository

Used to:
- Retrieve shot information for prompt generation
- Check for shot transition relationships
- Access previous shot data for continuity

## Error Handling

All API endpoints include proper error handling:
- 400 Bad Request for invalid parameters
- 404 Not Found for missing resources
- 500 Internal Server Error for unexpected failures
- Standardized error response format

## Testing

The implementation compiles successfully and integrates with the existing codebase. The service is ready for:
- Unit testing of individual methods
- Integration testing with ComfyUI
- Property-based testing for correctness properties

## Next Steps

To complete the keyframe functionality:
1. Implement property-based tests (tasks 13.2-13.6)
2. Create frontend KeyframeGeneratorView component (task 14)
3. Test end-to-end workflow with real ComfyUI instance
4. Add file management for copying generated images to storage
