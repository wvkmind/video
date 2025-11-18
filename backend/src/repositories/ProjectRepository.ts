import { Repository, FindOptionsWhere } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Project } from '../entities/Project';
import { BaseRepository } from './BaseRepository';

/**
 * Repository for Project entity with CRUD operations
 */
export class ProjectRepository extends BaseRepository<Project> {
  constructor() {
    super(AppDataSource.getRepository(Project));
  }

  /**
   * Find projects by status
   */
  async findByStatus(status: Project['status']): Promise<Project[]> {
    return this.repository.find({
      where: { status },
      order: { updatedAt: 'DESC' },
    });
  }

  /**
   * Find projects by type
   */
  async findByType(type: string): Promise<Project[]> {
    return this.repository.find({
      where: { type },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find project with all relations
   */
  async findByIdWithRelations(id: string): Promise<Project | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['story', 'scenes', 'shots', 'timelines', 'characters'],
    });
  }

  /**
   * Search projects by name
   */
  async searchByName(searchTerm: string): Promise<Project[]> {
    return this.repository
      .createQueryBuilder('project')
      .where('project.name LIKE :searchTerm', { searchTerm: `%${searchTerm}%` })
      .orderBy('project.updatedAt', 'DESC')
      .getMany();
  }

  /**
   * Find projects with pagination and filters
   */
  async findWithFilters(
    page: number = 1,
    limit: number = 10,
    filters?: {
      status?: Project['status'];
      type?: string;
      searchTerm?: string;
    }
  ): Promise<{ data: Project[]; total: number; page: number; limit: number; totalPages: number }> {
    const queryBuilder = this.repository.createQueryBuilder('project');

    if (filters?.status) {
      queryBuilder.andWhere('project.status = :status', { status: filters.status });
    }

    if (filters?.type) {
      queryBuilder.andWhere('project.type = :type', { type: filters.type });
    }

    if (filters?.searchTerm) {
      queryBuilder.andWhere('project.name LIKE :searchTerm', {
        searchTerm: `%${filters.searchTerm}%`,
      });
    }

    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit).orderBy('project.updatedAt', 'DESC');

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Archive a project
   */
  async archive(id: string): Promise<Project | null> {
    return this.update(id, { status: 'archived' });
  }

  /**
   * Count projects by status
   */
  async countByStatus(status: Project['status']): Promise<number> {
    return this.count({ status } as FindOptionsWhere<Project>);
  }
}
