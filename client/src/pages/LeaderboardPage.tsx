import React from 'react';
import { Container, Typography, Box } from '@mui/material';

const LeaderboardPage: React.FC = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Leaderboards
      </Typography>
      <Box sx={{ p: 3, backgroundColor: 'grey.100', borderRadius: 2 }}>
        <Typography variant="body1">
          See how you rank against other players in your sport and area.
        </Typography>
      </Box>
    </Container>
  );
};

export default LeaderboardPage;
