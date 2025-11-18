import { AppDataSource } from '../../config/database';
import { SystemConfigService } from '../SystemConfigService';

describe('SystemConfigService', () => {
  let systemConfigService: SystemConfigService;

  beforeAll(async () => {
    await AppDataSource.initialize();
  });

  afterAll(async () => {
    await AppDataSource.destroy();
  });

  beforeEach(async () => {
    systemConfigService = new SystemConfigService();
    // Clean up system config
    await AppDataSource.query('DELETE FROM system_configs');
  });

  describe('getConfig', () => {
    it('should create default config if not exists', async () => {
      const config = await systemConfigService.getConfig();

      expect(config).toBeDefined();
      expect(config.id).toBeDefined();
      expect(config.comfyuiBaseUrl).toBe('http://localhost:8188');
      expect(config.comfyuiTimeout).toBe(300);
      expect(config.poeModel).toBe('gpt-5.1');
      expect(config.storageBasePath).toBe('./storage');
      expect(config.ffmpegPath).toBe('ffmpeg');
    });

    it('should return existing config on subsequent calls', async () => {
      const config1 = await systemConfigService.getConfig();
      const config2 = await systemConfigService.getConfig();

      expect(config1.id).toBe(config2.id);
    });
  });

  describe('updateConfig', () => {
    it('should update ComfyUI configuration', async () => {
      const updates = {
        comfyuiBaseUrl: 'http://localhost:9999',
        comfyuiTimeout: 600,
      };

      const config = await systemConfigService.updateConfig(updates);

      expect(config.comfyuiBaseUrl).toBe('http://localhost:9999');
      expect(config.comfyuiTimeout).toBe(600);
    });

    it('should update Poe API configuration', async () => {
      const updates = {
        poeApiKey: 'test-key-123',
        poeModel: 'gpt-4',
        poeApiUrl: 'https://custom.api.com',
      };

      const config = await systemConfigService.updateConfig(updates);

      expect(config.poeApiKey).toBe('test-key-123');
      expect(config.poeModel).toBe('gpt-4');
      expect(config.poeApiUrl).toBe('https://custom.api.com');
    });

    it('should update storage configuration', async () => {
      const updates = {
        storageBasePath: '/custom/storage',
      };

      const config = await systemConfigService.updateConfig(updates);

      expect(config.storageBasePath).toBe('/custom/storage');
    });

    it('should update FFmpeg configuration', async () => {
      const updates = {
        ffmpegPath: '/usr/local/bin/ffmpeg',
      };

      const config = await systemConfigService.updateConfig(updates);

      expect(config.ffmpegPath).toBe('/usr/local/bin/ffmpeg');
    });

    it('should reject invalid ComfyUI URL', async () => {
      const updates = {
        comfyuiBaseUrl: 'not-a-valid-url',
      };

      await expect(systemConfigService.updateConfig(updates)).rejects.toThrow(
        /valid URL/
      );
    });

    it('should reject negative timeout', async () => {
      const updates = {
        comfyuiTimeout: -1,
      };

      await expect(systemConfigService.updateConfig(updates)).rejects.toThrow(
        /at least 1 second/
      );
    });

    it('should reject empty model name', async () => {
      const updates = {
        poeModel: '',
      };

      await expect(systemConfigService.updateConfig(updates)).rejects.toThrow(
        /cannot be empty/
      );
    });

    it('should reject invalid Poe API URL', async () => {
      const updates = {
        poeApiUrl: 'invalid-url',
      };

      await expect(systemConfigService.updateConfig(updates)).rejects.toThrow(
        /valid URL/
      );
    });

    it('should reject empty storage path', async () => {
      const updates = {
        storageBasePath: '',
      };

      await expect(systemConfigService.updateConfig(updates)).rejects.toThrow(
        /cannot be empty/
      );
    });

    it('should reject empty FFmpeg path', async () => {
      const updates = {
        ffmpegPath: '',
      };

      await expect(systemConfigService.updateConfig(updates)).rejects.toThrow(
        /cannot be empty/
      );
    });
  });

  describe('Validation Methods', () => {
    it('should validate ComfyUI config', async () => {
      // This test would require a running ComfyUI instance
      // In a real test, you would mock the axios call
      const result = await systemConfigService.validateComfyUIConfig();
      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('message');
    });

    it('should validate Poe API config', async () => {
      // This test would require a valid API key
      // In a real test, you would mock the axios call
      const result = await systemConfigService.validatePoeAPIConfig();
      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('message');
    });

    it('should validate FFmpeg config', async () => {
      // This test checks if FFmpeg is installed
      const result = await systemConfigService.validateFFmpegConfig();
      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('message');
    });

    it('should validate storage path', async () => {
      const result = await systemConfigService.validateStoragePath();
      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('message');
    });

    it('should validate all configs', async () => {
      const results = await systemConfigService.validateAllConfigs();
      expect(results).toHaveProperty('comfyui');
      expect(results).toHaveProperty('poeApi');
      expect(results).toHaveProperty('ffmpeg');
      expect(results).toHaveProperty('storage');
    });
  });
});
