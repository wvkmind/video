import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { SystemConfig } from '../entities/SystemConfig';

export class SystemConfigService {
  private repository: Repository<SystemConfig>;

  constructor() {
    this.repository = AppDataSource.getRepository(SystemConfig);
  }

  /**
   * Get system configuration (creates default if not exists)
   */
  async getConfig(): Promise<SystemConfig> {
    let config = await this.repository.findOne({ where: {} });

    if (!config) {
      // Create default configuration
      config = this.repository.create({
        comfyuiBaseUrl: 'http://localhost:8188',
        comfyuiTimeout: 300,
        poeApiKey: '',
        poeModel: 'gpt-5.1',
        poeApiUrl: 'https://api.poe.com/v1/chat/completions',
        storageBasePath: './storage',
        ffmpegPath: 'ffmpeg',
      });
      await this.repository.save(config);
    }

    return config;
  }

  /**
   * Update system configuration
   */
  async updateConfig(updates: Partial<SystemConfig>): Promise<SystemConfig> {
    let config = await this.getConfig();

    // Validate updates
    if (updates.comfyuiBaseUrl !== undefined) {
      this.validateUrl(updates.comfyuiBaseUrl, 'ComfyUI Base URL');
      config.comfyuiBaseUrl = updates.comfyuiBaseUrl;
    }

    if (updates.comfyuiTimeout !== undefined) {
      if (updates.comfyuiTimeout < 1) {
        throw new Error('ComfyUI timeout must be at least 1 second');
      }
      config.comfyuiTimeout = updates.comfyuiTimeout;
    }

    if (updates.poeApiKey !== undefined) {
      config.poeApiKey = updates.poeApiKey;
    }

    if (updates.poeModel !== undefined) {
      if (!updates.poeModel.trim()) {
        throw new Error('Poe model name cannot be empty');
      }
      config.poeModel = updates.poeModel;
    }

    if (updates.poeApiUrl !== undefined) {
      this.validateUrl(updates.poeApiUrl, 'Poe API URL');
      config.poeApiUrl = updates.poeApiUrl;
    }

    if (updates.storageBasePath !== undefined) {
      if (!updates.storageBasePath.trim()) {
        throw new Error('Storage base path cannot be empty');
      }
      config.storageBasePath = updates.storageBasePath;
    }

    if (updates.ffmpegPath !== undefined) {
      if (!updates.ffmpegPath.trim()) {
        throw new Error('FFmpeg path cannot be empty');
      }
      config.ffmpegPath = updates.ffmpegPath;
    }

    await this.repository.save(config);
    return config;
  }

  /**
   * Validate ComfyUI configuration
   */
  async validateComfyUIConfig(baseUrl?: string): Promise<{ valid: boolean; message: string }> {
    const config = await this.getConfig();
    const urlToTest = baseUrl || config.comfyuiBaseUrl;

    try {
      const axios = require('axios');
      const response = await axios.get(`${urlToTest}/system_stats`, {
        timeout: 5000,
      });

      if (response.status === 200) {
        return { valid: true, message: 'ComfyUI connection successful' };
      }

      return { valid: false, message: 'ComfyUI returned unexpected status' };
    } catch (error: any) {
      return {
        valid: false,
        message: `ComfyUI connection failed: ${error.message}`,
      };
    }
  }

  /**
   * Validate Poe API configuration
   */
  async validatePoeAPIConfig(
    apiKey?: string,
    apiUrl?: string
  ): Promise<{ valid: boolean; message: string }> {
    const config = await this.getConfig();
    const keyToTest = apiKey || config.poeApiKey;
    const urlToTest = apiUrl || config.poeApiUrl;

    if (!keyToTest) {
      return { valid: false, message: 'API key is not configured' };
    }

    try {
      const axios = require('axios');
      const response = await axios.post(
        urlToTest,
        {
          model: config.poeModel,
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 10,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${keyToTest}`,
          },
          timeout: 10000,
        }
      );

      if (response.status === 200) {
        return { valid: true, message: 'Poe API connection successful' };
      }

      return { valid: false, message: 'Poe API returned unexpected status' };
    } catch (error: any) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        return { valid: false, message: 'Invalid API key' };
      }

      return {
        valid: false,
        message: `Poe API connection failed: ${error.message}`,
      };
    }
  }

  /**
   * Validate FFmpeg installation
   */
  async validateFFmpegConfig(ffmpegPath?: string): Promise<{ valid: boolean; message: string }> {
    const config = await this.getConfig();
    const pathToTest = ffmpegPath || config.ffmpegPath;

    try {
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);

      const { stdout } = await execAsync(`${pathToTest} -version`);

      if (stdout.includes('ffmpeg version')) {
        return { valid: true, message: 'FFmpeg found and working' };
      }

      return { valid: false, message: 'FFmpeg command did not return expected output' };
    } catch (error: any) {
      return {
        valid: false,
        message: `FFmpeg not found or not working: ${error.message}`,
      };
    }
  }

  /**
   * Validate storage path
   */
  async validateStoragePath(storagePath?: string): Promise<{ valid: boolean; message: string }> {
    const config = await this.getConfig();
    const pathToTest = storagePath || config.storageBasePath;

    try {
      const fs = require('fs').promises;
      const path = require('path');

      // Check if path exists
      try {
        await fs.access(pathToTest);
      } catch {
        // Try to create the directory
        await fs.mkdir(pathToTest, { recursive: true });
      }

      // Test write permissions
      const testFile = path.join(pathToTest, '.write_test');
      await fs.writeFile(testFile, 'test');
      await fs.unlink(testFile);

      return { valid: true, message: 'Storage path is accessible and writable' };
    } catch (error: any) {
      return {
        valid: false,
        message: `Storage path validation failed: ${error.message}`,
      };
    }
  }

  /**
   * Validate all configurations
   */
  async validateAllConfigs(): Promise<{
    comfyui: { valid: boolean; message: string };
    poeApi: { valid: boolean; message: string };
    ffmpeg: { valid: boolean; message: string };
    storage: { valid: boolean; message: string };
  }> {
    const [comfyui, poeApi, ffmpeg, storage] = await Promise.all([
      this.validateComfyUIConfig(),
      this.validatePoeAPIConfig(),
      this.validateFFmpegConfig(),
      this.validateStoragePath(),
    ]);

    return { comfyui, poeApi, ffmpeg, storage };
  }

  /**
   * Helper method to validate URL format
   */
  private validateUrl(url: string, fieldName: string): void {
    if (!url.trim()) {
      throw new Error(`${fieldName} cannot be empty`);
    }

    try {
      new URL(url);
    } catch {
      throw new Error(`${fieldName} must be a valid URL`);
    }
  }
}
