import React from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Paper,
  useTheme,
} from '@mui/material';
import {
  SportsTennis,
  EmojiEvents,
  LocationOn,
  Speed,
  Group,
  TrendingUp,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const theme = useTheme();

  const features = [
    {
      icon: <SportsTennis sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'Smart Matchmaking',
      description: 'Find opponents with similar skill levels using our Elo rating system',
    },
    {
      icon: <LocationOn sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'Location-Based',
      description: 'Discover players and venues near you for convenient matches',
    },
    {
      icon: <EmojiEvents sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'Track Progress',
      description: 'Monitor your rating changes and climb the leaderboards',
    },
    {
      icon: <Speed sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'Quick Setup',
      description: 'Get started in minutes with our streamlined registration process',
    },
  ];

  const stats = [
    { label: 'Active Players', value: '1,200+' },
    { label: 'Matches Played', value: '5,400+' },
    { label: 'Venues Listed', value: '150+' },
    { label: 'Sports Supported', value: '3' },
  ];

  return (
    <Box>
      {/* Hero Section */}
      <Box
        sx={{
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
          color: 'white',
          py: 8,
          textAlign: 'center',
        }}
      >
        <Container maxWidth="md">
          <Typography variant="h2" component="h1" gutterBottom fontWeight="bold">
            Find Your Perfect Match
          </Typography>
          <Typography variant="h5" sx={{ mb: 4, opacity: 0.9 }}>
            Connect with players of similar skill levels for badminton, table tennis, and pickleball
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            {user ? (
              <Button
                variant="contained"
                size="large"
                onClick={() => navigate('/matchmaking')}
                sx={{
                  backgroundColor: 'white',
                  color: 'primary.main',
                  '&:hover': { backgroundColor: 'grey.100' },
                }}
              >
                Find a Match
              </Button>
            ) : (
              <>
                <Button
                  variant="contained"
                  size="large"
                  onClick={() => navigate('/signup')}
                  sx={{
                    backgroundColor: 'white',
                    color: 'primary.main',
                    '&:hover': { backgroundColor: 'grey.100' },
                  }}
                >
                  Get Started
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  onClick={() => navigate('/login')}
                  sx={{
                    borderColor: 'white',
                    color: 'white',
                    '&:hover': { borderColor: 'white', backgroundColor: 'rgba(255,255,255,0.1)' },
                  }}
                >
                  Sign In
                </Button>
              </>
            )}
          </Box>
        </Container>
      </Box>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography variant="h3" component="h2" textAlign="center" gutterBottom>
          Why Choose PlayMatch?
        </Typography>
        <Typography variant="h6" textAlign="center" color="text.secondary" sx={{ mb: 6 }}>
          Experience the future of sports matchmaking
        </Typography>
        
        <Grid container spacing={4}>
          {features.map((feature, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Card sx={{ height: '100%', textAlign: 'center' }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ mb: 2 }}>
                    {feature.icon}
                  </Box>
                  <Typography variant="h6" component="h3" gutterBottom>
                    {feature.title}
                  </Typography>
                  <Typography color="text.secondary">
                    {feature.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Stats Section */}
      <Box sx={{ backgroundColor: 'grey.50', py: 6 }}>
        <Container maxWidth="lg">
          <Typography variant="h3" component="h2" textAlign="center" gutterBottom>
            Join Our Growing Community
          </Typography>
          <Grid container spacing={4} sx={{ mt: 2 }}>
            {stats.map((stat, index) => (
              <Grid item xs={6} md={3} key={index}>
                <Paper sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="h3" component="div" color="primary.main" fontWeight="bold">
                    {stat.value}
                  </Typography>
                  <Typography variant="h6" color="text.secondary">
                    {stat.label}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Sports Section */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography variant="h3" component="h2" textAlign="center" gutterBottom>
          Supported Sports
        </Typography>
        <Typography variant="h6" textAlign="center" color="text.secondary" sx={{ mb: 6 }}>
          Find matches for your favorite racquet sports
        </Typography>
        
        <Grid container spacing={4}>
          {[
            { name: 'Badminton', description: 'Fast-paced racquet sport with shuttlecock' },
            { name: 'Table Tennis', description: 'Indoor ping pong with quick reflexes' },
            { name: 'Pickleball', description: 'Fun paddle sport for all ages' },
          ].map((sport, index) => (
            <Grid item xs={12} md={4} key={index}>
              <Card sx={{ height: '100%' }}>
                <CardContent sx={{ p: 4, textAlign: 'center' }}>
                  <SportsTennis sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
                  <Typography variant="h5" component="h3" gutterBottom>
                    {sport.name}
                  </Typography>
                  <Typography color="text.secondary">
                    {sport.description}
                  </Typography>
                </CardContent>
                <CardActions sx={{ justifyContent: 'center', pb: 3 }}>
                  <Button variant="outlined" color="primary">
                    Learn More
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* CTA Section */}
      <Box
        sx={{
          background: `linear-gradient(135deg, ${theme.palette.secondary.main} 0%, ${theme.palette.secondary.dark} 100%)`,
          color: 'white',
          py: 8,
          textAlign: 'center',
        }}
      >
        <Container maxWidth="md">
          <Typography variant="h3" component="h2" gutterBottom fontWeight="bold">
            Ready to Play?
          </Typography>
          <Typography variant="h6" sx={{ mb: 4, opacity: 0.9 }}>
            Join thousands of players who have found their perfect match
          </Typography>
          {!user && (
            <Button
              variant="contained"
              size="large"
              onClick={() => navigate('/signup')}
              sx={{
                backgroundColor: 'white',
                color: 'secondary.main',
                '&:hover': { backgroundColor: 'grey.100' },
              }}
            >
              Start Playing Today
            </Button>
          )}
        </Container>
      </Box>
    </Box>
  );
};

export default HomePage;
