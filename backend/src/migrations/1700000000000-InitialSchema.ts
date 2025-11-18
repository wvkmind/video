import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1700000000000 implements MigrationInterface {
  name = 'InitialSchema1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create projects table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "projects" (
        "id" varchar PRIMARY KEY NOT NULL,
        "name" varchar(255) NOT NULL,
        "type" varchar(100) NOT NULL,
        "targetDuration" integer NOT NULL,
        "targetStyle" text,
        "targetAudience" text,
        "notes" text,
        "status" varchar(50) NOT NULL DEFAULT 'draft',
        "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
        "updatedAt" datetime NOT NULL DEFAULT (datetime('now'))
      )
    `);

    // Create stories table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "stories" (
        "id" varchar PRIMARY KEY NOT NULL,
        "projectId" varchar NOT NULL,
        "hook" text,
        "middleStructure" text,
        "ending" text,
        "version" integer NOT NULL DEFAULT 1,
        "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
        "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE CASCADE
      )
    `);

    // Create scenes table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "scenes" (
        "id" varchar PRIMARY KEY NOT NULL,
        "projectId" varchar NOT NULL,
        "sceneNumber" integer NOT NULL,
        "title" varchar(255) NOT NULL,
        "description" text,
        "estimatedDuration" integer NOT NULL DEFAULT 0,
        "voiceoverText" text,
        "dialogueText" text,
        "notes" text,
        "version" integer NOT NULL DEFAULT 1,
        "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
        "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE CASCADE
      )
    `);

    // Create shots table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "shots" (
        "id" varchar PRIMARY KEY NOT NULL,
        "projectId" varchar NOT NULL,
        "sceneId" varchar NOT NULL,
        "shotId" varchar(50) NOT NULL,
        "sequenceNumber" integer NOT NULL,
        "duration" real NOT NULL DEFAULT 0,
        "shotType" varchar(50) NOT NULL,
        "description" text,
        "environment" text,
        "subject" text,
        "action" text,
        "cameraMovement" text,
        "lighting" text,
        "style" text,
        "previousShotId" varchar,
        "nextShotId" varchar,
        "transitionType" varchar(50) NOT NULL DEFAULT 'cut',
        "useLastFrameAsFirst" boolean NOT NULL DEFAULT 0,
        "relatedVoiceover" text,
        "importance" varchar(50) NOT NULL DEFAULT 'medium',
        "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
        "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE CASCADE,
        FOREIGN KEY ("sceneId") REFERENCES "scenes" ("id") ON DELETE CASCADE
      )
    `);

    // Create indexes for shots
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_shots_projectId_sequenceNumber" 
      ON "shots" ("projectId", "sequenceNumber")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_shots_sceneId_sequenceNumber" 
      ON "shots" ("sceneId", "sequenceNumber")
    `);

    // Create keyframes table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "keyframes" (
        "id" varchar PRIMARY KEY NOT NULL,
        "shotId" varchar NOT NULL,
        "version" integer NOT NULL,
        "prompt" text NOT NULL,
        "negativePrompt" text,
        "workflowName" varchar(100) NOT NULL,
        "steps" integer NOT NULL,
        "cfg" real NOT NULL,
        "sampler" varchar(100) NOT NULL,
        "width" integer NOT NULL,
        "height" integer NOT NULL,
        "seed" bigint NOT NULL,
        "imagePath" varchar(500) NOT NULL,
        "isSelected" boolean NOT NULL DEFAULT 0,
        "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY ("shotId") REFERENCES "shots" ("id") ON DELETE CASCADE
      )
    `);

    // Create index for keyframes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_keyframes_shotId_version" 
      ON "keyframes" ("shotId", "version")
    `);

    // Create clips table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "clips" (
        "id" varchar PRIMARY KEY NOT NULL,
        "shotId" varchar NOT NULL,
        "version" integer NOT NULL,
        "inputMode" varchar(50) NOT NULL,
        "keyframeId" varchar,
        "prompt" text NOT NULL,
        "workflowName" varchar(100) NOT NULL,
        "duration" real NOT NULL,
        "fps" integer NOT NULL,
        "width" integer NOT NULL,
        "height" integer NOT NULL,
        "steps" integer NOT NULL,
        "guidance" real NOT NULL,
        "cfg" real NOT NULL,
        "seed" bigint NOT NULL,
        "useLastFrameReference" boolean NOT NULL DEFAULT 0,
        "referenceClipId" varchar,
        "referenceFrameNumber" integer,
        "mode" varchar(50) NOT NULL DEFAULT 'demo',
        "videoPath" varchar(500),
        "status" varchar(50) NOT NULL DEFAULT 'pending',
        "comfyuiTaskId" varchar(100),
        "isSelected" boolean NOT NULL DEFAULT 0,
        "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
        "completedAt" datetime,
        FOREIGN KEY ("shotId") REFERENCES "shots" ("id") ON DELETE CASCADE
      )
    `);

    // Create index for clips
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_clips_shotId_version" 
      ON "clips" ("shotId", "version")
    `);

    // Create timelines table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "timelines" (
        "id" varchar PRIMARY KEY NOT NULL,
        "projectId" varchar NOT NULL,
        "version" integer NOT NULL,
        "versionName" varchar(255),
        "tracks" text NOT NULL,
        "voiceoverAudioPath" varchar(500),
        "bgmAudioPath" varchar(500),
        "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
        "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE CASCADE
      )
    `);

    // Create index for timelines
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_timelines_projectId_version" 
      ON "timelines" ("projectId", "version")
    `);

    // Create workflow_configs table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "workflow_configs" (
        "id" varchar PRIMARY KEY NOT NULL,
        "name" varchar(100) NOT NULL UNIQUE,
        "displayName" varchar(255) NOT NULL,
        "type" varchar(50) NOT NULL,
        "workflowJSON" text NOT NULL,
        "parameters" text NOT NULL,
        "isActive" boolean NOT NULL DEFAULT 1,
        "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
        "updatedAt" datetime NOT NULL DEFAULT (datetime('now'))
      )
    `);

    // Create character_presets table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "character_presets" (
        "id" varchar PRIMARY KEY NOT NULL,
        "projectId" varchar NOT NULL,
        "name" varchar(255) NOT NULL,
        "description" text NOT NULL,
        "referenceImagePath" varchar(500),
        "loraName" varchar(255),
        "promptTemplate" text,
        "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
        "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE CASCADE
      )
    `);

    // Create index for character_presets
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_character_presets_projectId" 
      ON "character_presets" ("projectId")
    `);

    // Create style_presets table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "style_presets" (
        "id" varchar PRIMARY KEY NOT NULL,
        "projectId" varchar,
        "name" varchar(255) NOT NULL,
        "promptPrefix" text,
        "promptSuffix" text,
        "negativePrompt" text,
        "defaultSteps" integer,
        "defaultCfg" real,
        "defaultSampler" varchar(100),
        "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
        "updatedAt" datetime NOT NULL DEFAULT (datetime('now'))
      )
    `);

    // Create index for style_presets
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_style_presets_projectId" 
      ON "style_presets" ("projectId")
    `);

    // Create system_configs table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "system_configs" (
        "id" varchar PRIMARY KEY NOT NULL,
        "comfyuiBaseUrl" varchar(500) NOT NULL DEFAULT 'http://localhost:8188',
        "comfyuiTimeout" integer NOT NULL DEFAULT 300,
        "poeApiKey" varchar(500),
        "poeModel" varchar(100) NOT NULL DEFAULT 'gpt-5.1',
        "poeApiUrl" varchar(500) NOT NULL DEFAULT 'https://api.poe.com/v1/chat/completions',
        "storageBasePath" varchar(500) NOT NULL DEFAULT './storage',
        "ffmpegPath" varchar(500) NOT NULL DEFAULT 'ffmpeg',
        "updatedAt" datetime NOT NULL DEFAULT (datetime('now'))
      )
    `);

    // Insert default system config
    await queryRunner.query(`
      INSERT INTO "system_configs" ("id", "comfyuiBaseUrl", "comfyuiTimeout", "poeModel", "poeApiUrl", "storageBasePath", "ffmpegPath")
      VALUES ('default', 'http://localhost:8188', 300, 'gpt-5.1', 'https://api.poe.com/v1/chat/completions', './storage', 'ffmpeg')
    `);

    // Create versions table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "versions" (
        "id" varchar PRIMARY KEY NOT NULL,
        "entityType" varchar(50) NOT NULL,
        "entityId" varchar NOT NULL,
        "versionNumber" integer NOT NULL,
        "versionName" varchar(255),
        "snapshot" text NOT NULL,
        "changeSummary" text,
        "createdBy" varchar(255),
        "createdAt" datetime NOT NULL DEFAULT (datetime('now'))
      )
    `);

    // Create index for versions
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_versions_entityType_entityId_versionNumber" 
      ON "versions" ("entityType", "entityId", "versionNumber")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order to respect foreign key constraints
    await queryRunner.query(`DROP TABLE IF EXISTS "versions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "system_configs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "style_presets"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "character_presets"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "workflow_configs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "timelines"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "clips"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "keyframes"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "shots"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "scenes"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "stories"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "projects"`);
  }
}
