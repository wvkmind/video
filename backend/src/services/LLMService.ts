import axios, { AxiosInstance } from 'axios';
import { config } from '../config/env';

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

  constructor() {
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
   * Generic method to call Poe API with retry logic
   */
  private async callPoeAPI(
    messages: PoeMessage[],
    temperature: number = 0.7,
    maxTokens: number = 2000
  ): Promise<string> {
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
   */
  async generateStoryOutline(projectDescription: string): Promise<{
    hook: string;
    middleStructure: string;
    ending: string;
  }> {
    const messages: PoeMessage[] = [
      {
        role: 'system',
        content: 'You are a professional storytelling assistant. Generate engaging story outlines for video content.',
      },
      {
        role: 'user',
        content: `Based on the following project description, generate a story outline with three parts:
1. Hook (开场): An engaging opening that captures attention
2. Middle Structure (中段结构): The main content and development
3. Ending (结尾): A satisfying conclusion

Project Description: ${projectDescription}

Please provide the outline in the following format:
Hook: [your hook here]
Middle: [your middle structure here]
Ending: [your ending here]`,
      },
    ];

    const response = await this.callPoeAPI(messages, 0.8, 1500);

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
   */
  async generateSceneScript(
    sceneDescription: string,
    storyOutline: { hook: string; middleStructure: string; ending: string }
  ): Promise<string> {
    const messages: PoeMessage[] = [
      {
        role: 'system',
        content: 'You are a professional scriptwriter. Generate detailed scene scripts for video production.',
      },
      {
        role: 'user',
        content: `Based on the following story outline and scene description, generate a detailed voiceover script for this scene.

Story Outline:
Hook: ${storyOutline.hook}
Middle: ${storyOutline.middleStructure}
Ending: ${storyOutline.ending}

Scene Description: ${sceneDescription}

Please write a natural, engaging voiceover script that fits this scene and aligns with the overall story. Keep it concise and suitable for video narration.`,
      },
    ];

    return await this.callPoeAPI(messages, 0.7, 1000);
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
