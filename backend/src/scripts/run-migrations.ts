import { AppDataSource } from '../config/database';

async function runMigrations() {
  try {
    console.log('正在初始化数据库连接...');
    await AppDataSource.initialize();
    console.log('数据库连接成功');

    console.log('正在运行迁移...');
    await AppDataSource.runMigrations();
    console.log('迁移完成');

    console.log('正在同步数据库 schema...');
    await AppDataSource.synchronize();
    console.log('Schema 同步完成');

    await AppDataSource.destroy();
    console.log('数据库连接已关闭');
    process.exit(0);
  } catch (error) {
    console.error('迁移失败:', error);
    process.exit(1);
  }
}

runMigrations();
