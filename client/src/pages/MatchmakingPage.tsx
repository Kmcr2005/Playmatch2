import React from 'react';
import { Container, Typography, Box } from '@mui/material';

const MatchmakingPage: React.FC = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Find a Match
      </Typography>
      <Box sx={{ p: 3, backgroundColor: 'grey.100', borderRadius: 2 }}>
        <Typography variant="body1">
          Find opponents for your favorite sports based on skill level and location.
        </Typography>
      </Box>
    </Container>
  );
};

export default MatchmakingPage;
