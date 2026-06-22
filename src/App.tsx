
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Overview from './pages/Overview';
import Sales from './pages/Sales';
import Support from './pages/Support';
import Finance from './pages/Finance';
import Settings from './pages/Settings';
import ConnectDataSource from './pages/ConnectDataSource';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Overview />} />
              <Route path="/connect" element={<ConnectDataSource />} />
              <Route path="/sales" element={<Sales />} />
              <Route path="/support" element={<Support />} />
              <Route path="/finance" element={<Finance />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
