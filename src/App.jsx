import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Layout from '@/components/Layout';
import { LensProvider } from '@/lib/LensContext';

// Pages
import Home from '@/pages/Home';
import AskRaco from '@/pages/AskRaco';
import Activity from '@/pages/Activity';
import Contacts from '@/pages/Contacts';
import Leads from '@/pages/Leads.jsx';
import Inventory from '@/pages/Inventory';
import Zones from '@/pages/Zones';
import Deals from '@/pages/Deals';
import Market from '@/pages/Market';
import Marketing from '@/pages/Marketing';
import Compliance from '@/pages/Compliance';
import Admin from '@/pages/Admin';
import Agents from '@/pages/Agents';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-evergreen/20 border-t-evergreen rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Loading Raco AI…</span>
        </div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') return <UserNotRegisteredError />;
    if (authError.type === 'auth_required') { navigateToLogin(); return null; }
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/ask" element={<AskRaco />} />
        <Route path="/activity" element={<Activity />} />
        <Route path="/contacts" element={<Contacts />} />
        <Route path="/leads" element={<Leads />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/zones" element={<Zones />} />
        <Route path="/deals" element={<Deals />} />
        <Route path="/market" element={<Market />} />
        <Route path="/marketing" element={<Marketing />} />
        <Route path="/compliance" element={<Compliance />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/agents" element={<Agents />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <LensProvider>
            <AuthenticatedApp />
          </LensProvider>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;