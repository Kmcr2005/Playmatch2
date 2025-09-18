import React from 'react';
import { Container, Typography, Box } from '@mui/material';

const DashboardPage: React.FC = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      <Box sx={{ p: 3, backgroundColor: 'grey.100', borderRadius: 2 }}>
        <Typography variant="body1">
          Welcome to your PlayMatch dashboard! This page will show your recent matches, 
          upcoming games, and quick actions to find new opponents.
        </Typography>
      </Box>
    </Container>
  );
};

export default DashboardPage;
