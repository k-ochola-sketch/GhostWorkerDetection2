import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Box } from '@mui/material';
import { QueryClient, QueryClientProvider } from 'react-query';
import { SnackbarProvider } from 'notistack';

// Components
import Login from './components/auth/Login';
import Dashboard from './components/dashboard/Dashboard';
import Students from './components/students/Students';
import Attendance from './components/attendance/Attendance';
import Schools from './components/schools/Schools';
import Reports from './components/reports/Reports';
import Capitation from './components/capitation/Capitation';
import Layout from './components/layout/Layout';

// Context
import { AuthProvider, useAuth } from './context/AuthContext';

// Theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2', // Kenya blue
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode; roles?: string[] }> = ({
  children,
  roles
}) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>Loading...</Box>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <SnackbarProvider maxSnack={3}>
          <AuthProvider>
            <Router>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route
                  path="/*"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <Routes>
                          <Route path="/dashboard" element={<Dashboard />} />
                          <Route path="/students" element={<Students />} />
                          <Route path="/attendance" element={<Attendance />} />
                          <Route path="/schools" element={
                            <ProtectedRoute roles={['Super Admin', 'Ministry Officer', 'County Director']}>
                              <Schools />
                            </ProtectedRoute>
                          } />
                          <Route path="/reports" element={<Reports />} />
                          <Route path="/capitation" element={
                            <ProtectedRoute roles={['Super Admin', 'Ministry Officer', 'County Director']}>
                              <Capitation />
                            </ProtectedRoute>
                          } />
                          <Route path="/" element={<Navigate to="/dashboard" replace />} />
                        </Routes>
                      </Layout>
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </Router>
          </AuthProvider>
        </SnackbarProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;