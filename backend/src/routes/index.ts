import { Router } from 'express';
import projectRoutes from './projectRoutes';
import storyRoutes from './storyRoutes';
import sceneRoutes from './sceneRoutes';
import shotRoutes from './shotRoutes';
import workflowRoutes from './workflowRoutes';
import keyframeRoutes from './keyframeRoutes';
import clipRoutes from './clipRoutes';
import timelineRoutes from './timelineRoutes';
import characterRoutes from './characterRoutes';
import styleRoutes from './styleRoutes';
import llmRoutes from './llmRoutes';
import systemConfigRoutes from './systemConfigRoutes';

const router = Router();

// Mount project routes
router.use('/projects', projectRoutes);

// Mount story routes (nested under projects)
router.use('/projects', storyRoutes);

// Mount scene routes
router.use('/scenes', sceneRoutes);

// Mount shot routes (both nested under projects and standalone)
router.use('/projects', shotRoutes);
router.use('/shots', shotRoutes);

// Mount workflow routes
router.use('/workflows', workflowRoutes);

// Mount keyframe routes (both nested under shots and standalone)
router.use('/shots', keyframeRoutes);
router.use('/keyframes', keyframeRoutes);

// Mount clip routes (both nested under shots and standalone)
router.use('/', clipRoutes);
router.use('/clips', clipRoutes);

// Mount timeline routes
router.use('/', timelineRoutes);

// Mount character routes
router.use('/', characterRoutes);

// Mount style routes
router.use('/', styleRoutes);

// Mount LLM routes (nested under projects, scenes, and shots)
router.use('/projects', llmRoutes);
router.use('/', llmRoutes);

// Mount system config routes
router.use('/system', systemConfigRoutes);

export default router;
