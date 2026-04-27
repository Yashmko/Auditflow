import { Toaster } from 'react-hot-toast';
import { useStore } from './store/useStore';
import { AuthPage } from './components/AuthPage';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { PipelineMonitor } from './components/PipelineMonitor';
import { LeadDatabase } from './components/LeadDatabase';
import { CampaignManager } from './components/CampaignManager';
import { FollowUps } from './components/FollowUps';
import { SettingsPage } from './components/SettingsPage';
import { usePipeline } from './hooks/usePipeline';

function AppContent() {
  const { activePage } = useStore();
  usePipeline();

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard': return <Dashboard />;
      case 'pipeline': return <PipelineMonitor />;
      case 'leads': return <LeadDatabase />;
      case 'campaigns': return <CampaignManager />;
      case 'followups': return <FollowUps />;
      case 'settings': return <SettingsPage />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
      <Sidebar />
      <main className="flex-1 overflow-hidden" style={{ background: 'var(--bg)' }}>
        {renderPage()}
      </main>
    </div>
  );
}

function App() {
  const { isAuthenticated } = useStore();

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#111',
            color: '#e8e8e8',
            border: '1px solid #222',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: 14,
          },
          success: { iconTheme: { primary: '#00ff88', secondary: '#000' } },
          error: { iconTheme: { primary: '#ff4444', secondary: '#fff' } },
        }}
      />
      {isAuthenticated ? <AppContent /> : <AuthPage />}
    </>
  );
}

export default App;
