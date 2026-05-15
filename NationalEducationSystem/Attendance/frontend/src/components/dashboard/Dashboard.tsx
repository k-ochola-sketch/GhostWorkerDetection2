import React from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Alert,
  Chip
} from '@mui/material';
import {
  School as SchoolIcon,
  People as PeopleIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  AttachMoney as MoneyIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import { useQuery } from 'react-query';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

interface DashboardStats {
  totalSchools: number;
  totalStudents: number;
  flaggedStudents: number;
  totalCapitation: number;
  disbursedCapitation: number;
  attendanceRate: number;
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();

  const { data: stats, isLoading, error } = useQuery<DashboardStats>(
    'dashboard-stats',
    async () => {
      const response = await axios.get('/reports/dashboard-stats');
      return response.data;
    },
    {
      enabled: !!user,
    }
  );

  if (isLoading) {
    return <Typography>Loading dashboard...</Typography>;
  }

  if (error) {
    return <Alert severity="error">Failed to load dashboard data</Alert>;
  }

  const statCards = [
    {
      title: 'Total Schools',
      value: stats?.totalSchools || 0,
      icon: <SchoolIcon fontSize="large" color="primary" />,
      color: 'primary.main',
    },
    {
      title: 'Total Students',
      value: stats?.totalStudents || 0,
      icon: <PeopleIcon fontSize="large" color="secondary" />,
      color: 'secondary.main',
    },
    {
      title: 'Flagged Students',
      value: stats?.flaggedStudents || 0,
      icon: <WarningIcon fontSize="large" sx={{ color: 'warning.main' }} />,
      color: 'warning.main',
      subtitle: 'Potential ghost students',
    },
    {
      title: 'Capitation Allocated',
      value: `KES ${(stats?.totalCapitation || 0).toLocaleString()}`,
      icon: <MoneyIcon fontSize="large" sx={{ color: 'success.main' }} />,
      color: 'success.main',
    },
    {
      title: 'Capitation Disbursed',
      value: `KES ${(stats?.disbursedCapitation || 0).toLocaleString()}`,
      icon: <CheckCircleIcon fontSize="large" sx={{ color: 'info.main' }} />,
      color: 'info.main',
    },
    {
      title: 'Average Attendance Rate',
      value: `${(stats?.attendanceRate || 0).toFixed(1)}%`,
      icon: <TrendingUpIcon fontSize="large" sx={{ color: 'success.main' }} />,
      color: 'success.main',
    },
  ];

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Kenya Education Attendance Dashboard
      </Typography>

      <Typography variant="subtitle1" color="text.secondary" gutterBottom>
        Welcome back, {user?.firstName}! Here's an overview of the education system.
      </Typography>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        {statCards.map((card, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="text.secondary" gutterBottom>
                      {card.title}
                    </Typography>
                    <Typography variant="h4" component="div">
                      {card.value}
                    </Typography>
                    {card.subtitle && (
                      <Typography variant="body2" color="text.secondary">
                        {card.subtitle}
                      </Typography>
                    )}
                  </Box>
                  <Box>
                    {card.icon}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Quick Actions */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h5" gutterBottom>
          Quick Actions
        </Typography>
        <Grid container spacing={2}>
          <Grid item>
            <Chip
              label="View Ghost Students"
              color="warning"
              variant="outlined"
              onClick={() => window.location.href = '/students?flagged=true'}
              sx={{ cursor: 'pointer' }}
            />
          </Grid>
          <Grid item>
            <Chip
              label="Record Attendance"
              color="primary"
              variant="outlined"
              onClick={() => window.location.href = '/attendance'}
              sx={{ cursor: 'pointer' }}
            />
          </Grid>
          <Grid item>
            <Chip
              label="Generate Reports"
              color="secondary"
              variant="outlined"
              onClick={() => window.location.href = '/reports'}
              sx={{ cursor: 'pointer' }}
            />
          </Grid>
        </Grid>
      </Box>

      {/* Alerts */}
      {(stats?.flaggedStudents || 0) > 0 && (
        <Alert severity="warning" sx={{ mt: 3 }}>
          <Typography variant="body1">
            <strong>Alert:</strong> {stats?.flaggedStudents} students have been flagged as potential ghost students.
            Please review their attendance records and capitation funding.
          </Typography>
        </Alert>
      )}
    </Box>
  );
};

export default Dashboard;