import { Routes, Route } from 'react-router-dom';
import { VoteProvider } from './context/VoteContext';
import Home from './pages/Home';
import VotingPage from './pages/VotingPage';
import ResultsPage from './pages/ResultsPage';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import NotFound from './pages/NotFound';

function App() {
  return (
    <VoteProvider>
      <div className="min-h-screen">
        <Routes>
          {/* Voter Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/vote/:electionId" element={<VotingPage />} />
          <Route path="/results/:electionId" element={<ResultsPage />} />
          
          {/* Admin Routes */}
          <Route path="/admin" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          
          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </VoteProvider>
  );
}

export default App;
