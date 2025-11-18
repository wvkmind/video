import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { AppDataSource } from './config/database';
import apiRoutes from './routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', message: 'AI视频生成管理系统后端运行中' });
});

// API routes
app.use('/api', apiRoutes);

// Initialize database and start server
AppDataSource.initialize()
  .then(async () => {
    console.log('数据库连接成功');
    
    // Load workflow configurations on startup
    try {
      const { WorkflowConfigService } = await import('./services/WorkflowConfigService');
      const workflowService = new WorkflowConfigService();
      const result = await workflowService.loadConfigs();
      console.log(`Workflow 配置加载完成: ${result.loaded} 成功, ${result.failed} 失败`);
      if (result.errors.length > 0) {
        console.warn('Workflow 加载错误:', result.errors);
      }
    } catch (error) {
      console.error('加载 Workflow 配置失败:', error);
      // Don't exit - continue running even if workflow loading fails
    }
    
    app.listen(PORT, () => {
      console.log(`服务器运行在端口 ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('数据库连接失败:', error);
    process.exit(1);
  });

export default app;
