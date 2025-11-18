import { AppDataSource } from '../config/database';
import { Project } from '../entities/Project';

async function testDatabase() {
  try {
    console.log('正在连接数据库...');
    await AppDataSource.initialize();
    console.log('✓ 数据库连接成功\n');

    // Test creating a project
    const projectRepo = AppDataSource.getRepository(Project);
    
    console.log('测试创建项目...');
    const testProject = projectRepo.create({
      name: '测试项目',
      type: '产品介绍',
      targetDuration: 60,
      targetStyle: '电影感',
      targetAudience: '年轻人',
      notes: '这是一个测试项目',
      status: 'draft',
    });
    
    await projectRepo.save(testProject);
    console.log('✓ 项目创建成功:', testProject.id);

    // Test querying the project
    console.log('\n测试查询项目...');
    const foundProject = await projectRepo.findOne({
      where: { id: testProject.id },
    });
    
    if (foundProject) {
      console.log('✓ 项目查询成功:');
      console.log('  - ID:', foundProject.id);
      console.log('  - 名称:', foundProject.name);
      console.log('  - 类型:', foundProject.type);
      console.log('  - 状态:', foundProject.status);
      console.log('  - 创建时间:', foundProject.createdAt);
    }

    // Test updating the project
    console.log('\n测试更新项目...');
    foundProject!.status = 'in_progress';
    await projectRepo.save(foundProject!);
    console.log('✓ 项目更新成功');

    // Test deleting the project
    console.log('\n测试删除项目...');
    await projectRepo.remove(foundProject!);
    console.log('✓ 项目删除成功');

    // Verify deletion
    const deletedProject = await projectRepo.findOne({
      where: { id: testProject.id },
    });
    
    if (!deletedProject) {
      console.log('✓ 确认项目已删除');
    }

    console.log('\n所有测试通过! ✓');
    
    await AppDataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('测试失败:', error);
    process.exit(1);
  }
}

testDatabase();
