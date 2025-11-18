import { AppDataSource } from '../config/database';

async function verifySchema() {
  try {
    console.log('正在初始化数据库连接...');
    await AppDataSource.initialize();
    console.log('数据库连接成功');

    // Get all table names
    const queryRunner = AppDataSource.createQueryRunner();
    const tables = await queryRunner.getTables();
    
    console.log('\n已创建的表:');
    console.log('='.repeat(50));
    
    for (const table of tables) {
      console.log(`\n表名: ${table.name}`);
      console.log('列:');
      table.columns.forEach((column) => {
        console.log(`  - ${column.name} (${column.type}${column.isNullable ? ', nullable' : ''})`);
      });
      
      if (table.foreignKeys.length > 0) {
        console.log('外键:');
        table.foreignKeys.forEach((fk) => {
          console.log(`  - ${fk.columnNames.join(', ')} -> ${fk.referencedTableName}(${fk.referencedColumnNames.join(', ')})`);
        });
      }
      
      if (table.indices.length > 0) {
        console.log('索引:');
        table.indices.forEach((index) => {
          console.log(`  - ${index.name}: ${index.columnNames.join(', ')}`);
        });
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log(`总共 ${tables.length} 个表`);

    await queryRunner.release();
    await AppDataSource.destroy();
    console.log('\n数据库连接已关闭');
    process.exit(0);
  } catch (error) {
    console.error('验证失败:', error);
    process.exit(1);
  }
}

verifySchema();
