import { BrowserRouter as Router, Routes, Route, useParams } from 'react-router-dom';
import ProjectListView from './components/ProjectListView';
import StoryEditorView from './components/StoryEditorView';
import StoryboardView from './components/StoryboardView';
import KeyframeGeneratorView from './components/KeyframeGeneratorView';
import { ClipGeneratorView } from './components/ClipGeneratorView';
import { TimelineEditorView } from './components/TimelineEditorView';

function ClipGeneratorWrapper() {
  const { projectId } = useParams<{ projectId: string }>();
  return <ClipGeneratorView projectId={parseInt(projectId || '0')} />;
}

function App() {
  return (
    <Router>
      <div className="app">
        <Routes>
          <Route path="/" element={<ProjectListView />} />
          <Route path="/projects/:projectId/story" element={<StoryEditorView />} />
          <Route path="/projects/:projectId/storyboard" element={<StoryboardView />} />
          <Route path="/projects/:projectId/keyframes" element={<KeyframeGeneratorView />} />
          <Route path="/projects/:projectId/clips" element={<ClipGeneratorWrapper />} />
          <Route path="/projects/:projectId/timeline" element={<TimelineEditorView />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
