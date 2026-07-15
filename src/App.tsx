import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './store/authStore';
import { useTenantStore } from './store/tenantStore';

// Layout
import { RootLayout } from './components/layout/RootLayout';

// Pages
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Schedule } from './pages/Schedule';
import { Retreats } from './pages/Retreats';
import { Experience } from './pages/Experience';
import { About } from './pages/About';
import { SuperadminDashboard } from './pages/superadmin/SuperadminDashboard';
import { SuspendedStudio } from './pages/shared/SuspendedStudio';

// Guards
import { ProtectedRoute } from './routes/ProtectedRoute';

export default function App() {
  const { initializeAuth } = useAuthStore();
  const { fetchTenantData, loadingTenant } = useTenantStore();

  useEffect(() => {
    fetchTenantData();
    initializeAuth();
  }, [fetchTenantData, initializeAuth]);

  if (loadingTenant) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-marfil">
        <div className="h-8 w-8 animate-spin rounded-full border-t-2 border-salvia"></div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Unprotected blocking pages */}
        <Route path="/suspended" element={<SuspendedStudio />} />

        {/* Base Platform & Tenant Studio Pages */}
        <Route element={<RootLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Protected Pages */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute allowedRoles={['superadmin', 'admin']}>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/schedule" 
            element={
              <ProtectedRoute allowedRoles={['superadmin', 'admin', 'instructor', 'student']}>
                <Schedule />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/retreats" 
            element={
              <ProtectedRoute allowedRoles={['superadmin', 'admin', 'instructor', 'student']}>
                <Retreats />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/experience" 
            element={
              <ProtectedRoute allowedRoles={['superadmin', 'admin', 'instructor', 'student']}>
                <Experience />
              </ProtectedRoute>
            } 
          />
          
          {/* Superadmin Exclusive Route */}
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute allowedRoles={['superadmin']}>
                <SuperadminDashboard />
              </ProtectedRoute>
            } 
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
