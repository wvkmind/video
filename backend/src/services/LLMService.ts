import axios, { AxiosInstance } from 'axios';
import { config } from '../config/env';
import { SystemConfigService } from './SystemConfigService';

interface PoeMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface PoeAPIRequest {
  model: string;
  messages: PoeMessage[];
  temperature?: number;
  max_tokens?: number;
}

interface PoeAPIResponse {
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
  }>;
}

export class LLMService {
  private client: AxiosInstance;
  private apiKey: string;
  private model: string;
  private apiUrl: string;
  private maxRetries: number = 3;
  private retryDelay: number = 1000; // 1 second
  private systemConfigService: SystemConfigService;

  constructor() {
    this.systemConfigService = new SystemConfigService();
    this.apiKey = config.poe.apiKey;
    this.model = config.poe.model;
    this.apiUrl = config.poe.apiUrl;

    this.client = axios.create({
      baseURL: this.apiUrl,
      timeout: 60000, // 60 seconds
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });
  }

  /**
   * Load configuration from system config (database)
   */
  private async loadConfig(): Promise<void> {
    try {
      const systemConfig = await this.systemConfigService.getConfig();
      
      // Use system config if available, otherwise fall back to env vars
      if (systemConfig.poeApiKey) {
        this.apiKey = systemConfig.poeApiKey;
        this.client.defaults.headers['Authorization'] = `Bearer ${this.apiKey}`;
      }
      
      if (systemConfig.poeModel) {
        this.model = systemConfig.poeModel;
      }
      
      if (systemConfig.poeApiUrl) {
        this.apiUrl = systemConfig.poeApiUrl;
        this.client.defaults.baseURL = this.apiUrl;
      }
    } catch (error) {
      console.warn('Failed to load system config, using environment variables:', error);
    }
  }

  /**
   * Generic method to call Poe API with retry logic
   */
  private async callPoeAPI(
    messages: PoeMessage[],
    temperature: number = 0.7,
    maxTokens: number = 2000
  ): Promise<string> {
    // Load config from database before each API call
    await this.loadConfig();

    if (!this.apiKey) {
      throw new Error('POE_API_KEY is not configured. Please set it in environment variables or system config.');
    }

    const request: PoeAPIRequest = {
      model: this.model,
      messages,
      temperature,
      max_tokens: maxTokens,
    };

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await this.client.post<PoeAPIResponse>('', request);

        if (response.data.choices && response.data.choices.length > 0) {
          return response.data.choices[0].message.content;
        }

        throw new Error('No response from LLM API');
      } catch (error: any) {
        lastError = error;

        // Don't retry on authentication errors
        if (error.response?.status === 401 || error.response?.status === 403) {
          throw new Error('Invalid API key. Please check your POE_API_KEY configuration.');
        }

        // Don't retry on bad request errors
        if (error.response?.status === 400) {
          throw new Error(`Bad request to LLM API: ${error.response?.data?.error?.message || error.message}`);
        }

        // Retry on network errors or 5xx errors
        if (attempt < this.maxRetries) {
          const delay = this.retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
          console.log(`LLM API call failed (attempt ${attempt}/${this.maxRetries}), retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(`LLM API call failed after ${this.maxRetries} attempts: ${lastError?.message}`);
  }

  /**
   * Generate story outline based on project description
   * Optimized for short-form vertical videos (15-60 seconds)
   */
  async generateStoryOutline(projectDescription: string): Promise<{
    hook: string;
    middleStructure: string;
    ending: string;
  }> {
    const messages: PoeMessage[] = [
      {
        role: 'system',
        content: 'You are a TikTok/Douyin short video expert. Create punchy, attention-grabbing outlines for 15-60 second vertical videos.',
      },
      {
        role: 'user',
        content: `Create a story outline for a 15-60 second short video. Keep it simple and impactful.

Topic: ${projectDescription}

Format:
Hook: [3-5 second attention grabber - max 50 chars]
Middle: [10-40 second main content - max 150 chars]
Ending: [5-10 second call-to-action or punchline - max 50 chars]`,
      },
    ];

    const response = await this.callPoeAPI(messages, 0.8, 800);

    // Parse the response
    const hookMatch = response.match(/Hook:\s*(.+?)(?=\nMiddle:|$)/s);
    const middleMatch = response.match(/Middle:\s*(.+?)(?=\nEnding:|$)/s);
    const endingMatch = response.match(/Ending:\s*(.+?)$/s);

    return {
      hook: hookMatch ? hookMatch[1].trim() : '',
      middleStructure: middleMatch ? middleMatch[1].trim() : '',
      ending: endingMatch ? endingMatch[1].trim() : '',
    };
  }

  /**
   * Generate scene script based on scene description and story outline
   * Optimized for short-form videos
   */
  async generateSceneScript(
    sceneDescription: string,
    storyOutline: { hook: string; middleStructure: string; ending: string }
  ): Promise<string> {
    const messages: PoeMessage[] = [
      {
        role: 'system',
        content: 'You are a TikTok/Douyin scriptwriter. Write punchy, conversational voiceovers for short videos. Keep it under 50 words.',
      },
      {
        role: 'user',
        content: `Write a short voiceover script (max 50 words, 5-15 seconds when spoken).

Story context:
Hook: ${storyOutline.hook}
Middle: ${storyOutline.middleStructure}
Ending: ${storyOutline.ending}

This scene: ${sceneDescription}

Write in a casual, engaging tone. No fluff, just the key message.`,
      },
    ];

    return await this.callPoeAPI(messages, 0.7, 500);
  }

  /**
   * Optimize shot description into English prompt for image generation
   */
  async optimizePrompt(shotDescription: {
    environment?: string;
    subject?: string;
    action?: string;
    cameraMovement?: string;
    lighting?: string;
    style?: string;
  }): Promise<string> {
    const descriptionParts = [
      shotDescription.environment,
      shotDescription.subject,
      shotDescription.action,
      shotDescription.cameraMovement,
      shotDescription.lighting,
      shotDescription.style,
    ].filter(Boolean);

    const combinedDescription = descriptionParts.join(', ');

    const messages: PoeMessage[] = [
      {
        role: 'system',
        content: 'You are an expert at writing prompts for AI image generation models like Stable Diffusion. Convert scene descriptions into optimized English prompts.',
      },
      {
        role: 'user',
        content: `Convert the following scene description into an optimized English prompt for AI image generation. Focus on visual details, composition, lighting, and style. Use comma-separated keywords and phrases.

Scene Description: ${combinedDescription}

Provide only the optimized prompt without any explanation.`,
      },
    ];

    return await this.callPoeAPI(messages, 0.5, 500);
  }

  /**
   * Compress voiceover text to fit target duration
   */
  async compressVoiceover(text: string, targetDuration: number): Promise<string> {
    // Estimate words per second (typical narration is ~2.5-3 words per second)
    const wordsPerSecond = 2.5;
    const targetWords = Math.floor(targetDuration * wordsPerSecond);
    const currentWords = text.split(/\s+/).length;

    if (currentWords <= targetWords) {
      return text; // No compression needed
    }

    const messages: PoeMessage[] = [
      {
        role: 'system',
        content: 'You are a professional editor. Compress text while maintaining its core message and natural flow.',
      },
      {
        role: 'user',
        content: `Compress the following voiceover text to approximately ${targetWords} words (target duration: ${targetDuration} seconds at ~2.5 words per second). Maintain the key message and natural narration flow.

Original text (${currentWords} words):
${text}

Provide only the compressed text without any explanation.`,
      },
    ];

    return await this.callPoeAPI(messages, 0.3, 1000);
  }

  /**
   * Generate scene list based on story outline
   */
  async generateScenes(storyOutline: {
    hook: string;
    middleStructure: string;
    ending: string;
  }): Promise<Array<{
    title: string;
    description: string;
    estimatedDuration: number;
  }>> {
    const messages: PoeMessage[] = [
      {
        role: 'system',
        content: 'You are a short-form video director specializing in 15-60 second TikTok/Douyin videos. You always respond with valid JSON arrays only. Keep everything ultra-concise.',
      },
      {
        role: 'user',
        content: `Generate 2-4 scenes for a short video (15-60 seconds total). Each scene should be 5-20 seconds.

Story Outline:
Hook: ${storyOutline.hook}
Middle: ${storyOutline.middleStructure}
Ending: ${storyOutline.ending}

Return ONLY a JSON array (no markdown, no explanation):
[
  {
    "title": "Scene title (max 30 chars)",
    "description": "Brief description (max 100 chars)",
    "estimatedDuration": 10
  }
]`,
      },
    ];

    const response = await this.callPoeAPI(messages, 0.7, 3000);
    
    console.log('LLM response for scenes (length: ' + response.length + '):', response.substring(0, 500) + '...');
    
    try {
      // Try to extract JSON from response
      // Remove markdown code blocks if present
      let cleanedResponse = response.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      
      // Try to find JSON array
      const jsonMatch = cleanedResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        let jsonStr = jsonMatch[0];
        
        // Check if JSON is truncated (doesn't end with proper closing)
        if (!jsonStr.trim().endsWith(']')) {
          console.warn('JSON appears truncated, attempting to fix...');
          // Try to close the last object and array
          const lastComma = jsonStr.lastIndexOf(',');
          if (lastComma > 0) {
            jsonStr = jsonStr.substring(0, lastComma) + ']';
          }
        }
        
        const parsed = JSON.parse(jsonStr);
        console.log('Successfully parsed scenes:', parsed.length, 'items');
        return parsed;
      }
      
      console.error('No JSON array found in response');
      throw new Error('Failed to parse scene list from LLM response');
    } catch (error: any) {
      console.error('Failed to parse scene list:', error.message);
      console.error('Raw response length:', response.length);
      throw new Error('Failed to generate valid scene list. The response may be too long or malformed.');
    }
  }

  /**
   * Generate shot list for a scene
   */
  async generateShots(
    sceneTitle: string,
    sceneDescription: string,
    voiceoverText?: string
  ): Promise<Array<{
    title: string;
    description: string;
    duration: number;
    environment?: string;
    subject?: string;
    action?: string;
    cameraMovement?: string;
    lighting?: string;
    style?: string;
  }>> {
    const messages: PoeMessage[] = [
      {
        role: 'system',
        content: 'You are a TikTok/Douyin video director. You always respond with valid JSON arrays only. Keep everything ultra-concise for short-form vertical videos.',
      },
      {
        role: 'user',
        content: `Generate 2-3 shots for this scene in a short video (each shot 3-8 seconds). Keep it simple and punchy.

Scene: ${sceneTitle}
Description: ${sceneDescription}
${voiceoverText ? `Voiceover: ${voiceoverText.substring(0, 150)}` : ''}

Return ONLY a JSON array (no markdown, no explanation):
[
  {
    "title": "Shot title (max 20 chars)",
    "description": "Brief description (max 60 chars)",
    "duration": 5,
    "environment": "Location (max 40 chars)",
    "subject": "Subject (max 40 chars)",
    "action": "Action (max 50 chars)",
    "cameraMovement": "static/pan/zoom",
    "lighting": "Lighting (max 30 chars)",
    "style": "TikTok/cinematic/vlog"
  }
]`,
      },
    ];

    const response = await this.callPoeAPI(messages, 0.7, 4000);
    
    console.log('LLM response for shots (length: ' + response.length + '):', response.substring(0, 500) + '...');
    
    try {
      // Try to extract JSON from response
      // Remove markdown code blocks if present
      let cleanedResponse = response.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      
      // Try to find JSON array
      const jsonMatch = cleanedResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        let jsonStr = jsonMatch[0];
        
        // Check if JSON is truncated (doesn't end with proper closing)
        if (!jsonStr.trim().endsWith(']')) {
          console.warn('JSON appears truncated, attempting to fix...');
          // Try to close the last object and array
          const lastComma = jsonStr.lastIndexOf(',');
          if (lastComma > 0) {
            jsonStr = jsonStr.substring(0, lastComma) + ']';
          }
        }
        
        const parsed = JSON.parse(jsonStr);
        console.log('Successfully parsed shots:', parsed.length, 'items');
        return parsed;
      }
      
      console.error('No JSON array found in response');
      throw new Error('Failed to parse shot list from LLM response');
    } catch (error: any) {
      console.error('Failed to parse shot list:', error.message);
      console.error('Raw response length:', response.length);
      throw new Error('Failed to generate valid shot list. The response may be too long or malformed.');
    }
  }

  /**
   * Update API configuration
   */
  updateConfig(apiKey?: string, model?: string, apiUrl?: string): void {
    if (apiKey) {
      this.apiKey = apiKey;
      this.client.defaults.headers['Authorization'] = `Bearer ${apiKey}`;
    }
    if (model) {
      this.model = model;
    }
    if (apiUrl) {
      this.apiUrl = apiUrl;
      this.client.defaults.baseURL = apiUrl;
    }
  }
}
