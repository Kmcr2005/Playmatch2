import React from 'react';
import { Container, Typography, Box } from '@mui/material';

const TurfsPage: React.FC = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Find Venues
      </Typography>
      <Box sx={{ p: 3, backgroundColor: 'grey.100', borderRadius: 2 }}>
        <Typography variant="body1">
          Discover sports venues and courts near you for your matches.
        </Typography>
      </Box>
    </Container>
  );
};

export default TurfsPage;
