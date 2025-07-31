import React from 'react';
import { Link } from 'react-router-dom';
import { Button, Container, Typography, Box, Paper } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import HomeIcon from '@mui/icons-material/Home';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const NotFound: React.FC = () => {
  const goBack = () => {
    window.history.back();
  };

  return (
    <Container maxWidth="md" sx={{ py: 8 }}>
      <Paper 
        elevation={3} 
        sx={{ 
          p: 5, 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          borderRadius: 2
        }}
      >
        <ErrorOutlineIcon color="primary" sx={{ fontSize: 80, mb: 2 }} />
        
        <Typography variant="h2" component="h1" gutterBottom align="center" color="primary" fontWeight="bold">
          404
        </Typography>
        
        <Typography variant="h4" component="h2" gutterBottom align="center">
          Page Not Found
        </Typography>
        
        <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 4, maxWidth: 500 }}>
          The page you are looking for might have been removed, had its name changed, 
          or is temporarily unavailable.
        </Typography>
        
        <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Button 
            variant="outlined" 
            color="primary" 
            startIcon={<ArrowBackIcon />}
            onClick={goBack}
          >
            Go Back
          </Button>
          
          <Button 
            variant="contained" 
            color="primary" 
            component={Link} 
            to="/"
            startIcon={<HomeIcon />}
          >
            Go to Dashboard
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default NotFound;