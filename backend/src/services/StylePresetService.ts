import { AppDataSource } from '../config/database';
import { StylePreset } from '../entities/StylePreset';
import { Shot } from '../entities/Shot';

export interface CreateStyleDTO {
  name: string;
  description?: string;
  promptPrefix?: string;
  promptSuffix?: string;
  negativePrompt?: string;
  isGlobal?: boolean;
}

export class StylePresetService {
  private styleRepository = AppDataSource.getRepository(StylePreset);
  private shotRepository = AppDataSource.getRepository(Shot);

  async createStyle(data: CreateStyleDTO): Promise<StylePreset> {
    const style = this.styleRepository.create(data);
    return await this.styleRepository.save(style);
  }

  async updateStyle(id: number, data: Partial<CreateStyleDTO>): Promise<StylePreset> {
    await this.styleRepository.update(id, data);
    const style = await this.styleRepository.findOne({ where: { id } });
    if (!style) {
      throw new Error('Style not found');
    }
    return style;
  }

  async deleteStyle(id: number): Promise<void> {
    await this.styleRepository.delete(id);
  }

  async listStyles(isGlobal?: boolean): Promise<StylePreset[]> {
    const where = isGlobal !== undefined ? { isGlobal } : {};
    return await this.styleRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  async getStyle(id: number): Promise<StylePreset | null> {
    return await this.styleRepository.findOne({ where: { id } });
  }

  /**
   * 批量应用风格到镜头
   */
  async applyStyleToShots(styleId: number, shotIds: number[]): Promise<void> {
    const style = await this.getStyle(styleId);
    if (!style) {
      throw new Error('Style not found');
    }

    for (const shotId of shotIds) {
      const shot = await this.shotRepository.findOne({ where: { id: shotId } });
      if (shot) {
        shot.style = style.name;
        await this.shotRepository.save(shot);
      }
    }
  }

  /**
   * 将风格应用到 prompt
   */
  applyStyleToPrompt(basePrompt: string, style: StylePreset): { prompt: string; negativePrompt: string } {
    let enhancedPrompt = basePrompt;

    // 添加前缀
    if (style.promptPrefix) {
      enhancedPrompt = `${style.promptPrefix}, ${enhancedPrompt}`;
    }

    // 添加后缀
    if (style.promptSuffix) {
      enhancedPrompt = `${enhancedPrompt}, ${style.promptSuffix}`;
    }

    return {
      prompt: enhancedPrompt,
      negativePrompt: style.negativePrompt || '',
    };
  }
}
