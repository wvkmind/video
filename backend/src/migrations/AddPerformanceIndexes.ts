import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration to add performance indexes for optimizing common queries
 */
export class AddPerformanceIndexes1700000000000 implements MigrationInterface {
  name = 'AddPerformanceIndexes1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Project indexes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_project_status" ON "project" ("status")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_project_type" ON "project" ("type")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_project_updated_at" ON "project" ("updatedAt")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_project_created_at" ON "project" ("createdAt")
    `);

    // Shot indexes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_shot_project_id" ON "shot" ("projectId")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_shot_scene_id" ON "shot" ("sceneId")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_shot_sequence_number" ON "shot" ("sequenceNumber")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_shot_project_sequence" ON "shot" ("projectId", "sequenceNumber")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_shot_status" ON "shot" ("status")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_shot_previous_shot_id" ON "shot" ("previousShotId")
    `);

    // Scene indexes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_scene_project_id" ON "scene" ("projectId")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_scene_scene_number" ON "scene" ("sceneNumber")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_scene_status" ON "scene" ("status")
    `);

    // Keyframe indexes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_keyframe_shot_id" ON "keyframe" ("shotId")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_keyframe_is_selected" ON "keyframe" ("isSelected")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_keyframe_shot_selected" ON "keyframe" ("shotId", "isSelected")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_keyframe_status" ON "keyframe" ("status")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_keyframe_comfyui_task_id" ON "keyframe" ("comfyuiTaskId")
    `);

    // Clip indexes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_clip_shot_id" ON "clip" ("shotId")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_clip_is_selected" ON "clip" ("isSelected")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_clip_shot_selected" ON "clip" ("shotId", "isSelected")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_clip_status" ON "clip" ("status")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_clip_comfyui_task_id" ON "clip" ("comfyuiTaskId")
    `);

    // Timeline indexes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_timeline_project_id" ON "timeline" ("projectId")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_timeline_version" ON "timeline" ("version")
    `);

    // Character preset indexes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_character_preset_project_id" ON "character_preset" ("projectId")
    `);

    // Style preset indexes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_style_preset_project_id" ON "style_preset" ("projectId")
    `);

    // Workflow config indexes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_workflow_config_type" ON "workflow_config" ("type")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_workflow_config_is_active" ON "workflow_config" ("isActive")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop all indexes in reverse order
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_workflow_config_is_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_workflow_config_type"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_style_preset_project_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_character_preset_project_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_timeline_version"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_timeline_project_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_clip_comfyui_task_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_clip_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_clip_shot_selected"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_clip_is_selected"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_clip_shot_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_keyframe_comfyui_task_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_keyframe_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_keyframe_shot_selected"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_keyframe_is_selected"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_keyframe_shot_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_scene_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_scene_scene_number"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_scene_project_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_shot_previous_shot_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_shot_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_shot_project_sequence"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_shot_sequence_number"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_shot_scene_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_shot_project_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_project_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_project_updated_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_project_type"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_project_status"`);
  }
}
