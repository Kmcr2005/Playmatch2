import React from 'react';
import { Container, Typography, Box } from '@mui/material';

const MatchesPage: React.FC = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        My Matches
      </Typography>
      <Box sx={{ p: 3, backgroundColor: 'grey.100', borderRadius: 2 }}>
        <Typography variant="body1">
          View your match history, report results, and track your rating changes.
        </Typography>
      </Box>
    </Container>
  );
};

export default MatchesPage;
