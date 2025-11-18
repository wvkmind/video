import { AppDataSource } from '../config/database';
import { CharacterPreset } from '../entities/CharacterPreset';

export interface CreateCharacterDTO {
  projectId: string;
  name: string;
  description?: string;
  referenceImagePath?: string;
  loraName?: string;
  promptTemplate?: string;
}

export class CharacterPresetService {
  private characterRepository = AppDataSource.getRepository(CharacterPreset);

  async createCharacter(data: CreateCharacterDTO): Promise<CharacterPreset> {
    const character = this.characterRepository.create(data);
    return await this.characterRepository.save(character);
  }

  async updateCharacter(id: number, data: Partial<CreateCharacterDTO>): Promise<CharacterPreset> {
    await this.characterRepository.update(id, data);
    const character = await this.characterRepository.findOne({ where: { id } });
    if (!character) {
      throw new Error('Character not found');
    }
    return character;
  }

  async deleteCharacter(id: number): Promise<void> {
    await this.characterRepository.delete(id);
  }

  async listCharacters(projectId: string): Promise<CharacterPreset[]> {
    return await this.characterRepository.find({
      where: { projectId },
      order: { createdAt: 'DESC' },
    });
  }

  async getCharacter(id: number): Promise<CharacterPreset | null> {
    return await this.characterRepository.findOne({ where: { id } });
  }

  /**
   * 将角色应用到镜头的 prompt
   */
  applyCharacterToPrompt(basePrompt: string, character: CharacterPreset): string {
    let enhancedPrompt = basePrompt;

    // 添加角色描述
    if (character.description) {
      enhancedPrompt = `${character.description}, ${enhancedPrompt}`;
    }

    // 应用 prompt 模板
    if (character.promptTemplate) {
      enhancedPrompt = character.promptTemplate.replace('{prompt}', enhancedPrompt);
    }

    // 添加 LoRA 触发词
    if (character.loraName) {
      enhancedPrompt = `<lora:${character.loraName}:1.0> ${enhancedPrompt}`;
    }

    return enhancedPrompt;
  }
}
