import { lazy } from 'react';

/**
 * Lazy-loaded route components for code splitting
 * Each route is loaded only when needed, reducing initial bundle size
 */

// Project views
export const ProjectListView = lazy(() => import('../components/ProjectListView'));
export const ProjectDetailView = lazy(() => import('../components/ProjectDetailView'));

// Story views
export const StoryEditorView = lazy(() => import('../components/StoryEditorView'));
export const StoryboardView = lazy(() => import('../components/StoryboardView'));

// Generation views
export const KeyframeGeneratorView = lazy(() => import('../components/KeyframeGeneratorView'));
export const ClipGeneratorView = lazy(() => import('../components/ClipGeneratorView'));

// Timeline views
export const TimelineEditorView = lazy(() => import('../components/TimelineEditorView'));

// System views
export const SystemConfigView = lazy(() => import('../components/SystemConfigView'));

// Demo views
export const ErrorHandlingDemo = lazy(() => import('../components/ErrorHandlingDemo'));
