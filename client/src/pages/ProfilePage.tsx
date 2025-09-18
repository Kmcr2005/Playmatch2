import React from 'react';
import { Container, Typography, Box } from '@mui/material';

const ProfilePage: React.FC = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Profile
      </Typography>
      <Box sx={{ p: 3, backgroundColor: 'grey.100', borderRadius: 2 }}>
        <Typography variant="body1">
          Manage your profile, sports preferences, and location settings here.
        </Typography>
      </Box>
    </Container>
  );
};

export default ProfilePage;
