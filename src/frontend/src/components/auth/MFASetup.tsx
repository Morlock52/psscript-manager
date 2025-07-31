import React, { useState } from 'react';
import { useMFA } from '../../hooks/useEnhancedAuth';
import { Alert, Button, TextField, Box, Typography, Paper, Grid } from '@mui/material';
import { QRCodeSVG } from 'qrcode.react';

export const MFASetup: React.FC = () => {
  const { setupMFA, verifyMFA } = useMFA();
  const [step, setStep] = useState<'setup' | 'verify' | 'complete'>('setup');
  const [setupData, setSetupData] = useState<any>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSetupMFA = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await setupMFA();
      setSetupData(data);
      setStep('verify');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to setup MFA');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyMFA = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await verifyMFA(verificationCode, setupData.secret);
      setBackupCodes(result.backupCodes);
      setStep('complete');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const downloadBackupCodes = () => {
    const content = backupCodes.join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'psscript-backup-codes.txt';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (step === 'setup') {
    return (
      <Paper elevation={3} sx={{ p: 4, maxWidth: 600, mx: 'auto' }}>
        <Typography variant="h5" gutterBottom>
          Enable Two-Factor Authentication
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Two-factor authentication adds an extra layer of security to your account by requiring a verification code in addition to your password.
        </Typography>
        <Button
          variant="contained"
          onClick={handleSetupMFA}
          disabled={loading}
          fullWidth
        >
          {loading ? 'Setting up...' : 'Get Started'}
        </Button>
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      </Paper>
    );
  }

  if (step === 'verify') {
    return (
      <Paper elevation={3} sx={{ p: 4, maxWidth: 600, mx: 'auto' }}>
        <Typography variant="h5" gutterBottom>
          Scan QR Code
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
              <QRCodeSVG value={setupData.qrCode} size={200} />
            </Box>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Typography variant="body2" gutterBottom>
              <strong>Can't scan?</strong> Enter this key manually:
            </Typography>
            <Typography variant="body2" sx={{ 
              fontFamily: 'monospace', 
              backgroundColor: 'grey.100',
              p: 1,
              borderRadius: 1,
              wordBreak: 'break-all'
            }}>
              {setupData.manualEntryKey}
            </Typography>
          </Grid>
        </Grid>

        <Typography variant="body1" sx={{ mt: 3, mb: 2 }}>
          Enter the 6-digit code from your authenticator app:
        </Typography>
        
        <TextField
          fullWidth
          value={verificationCode}
          onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="000000"
          inputProps={{ 
            maxLength: 6,
            style: { textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5rem' }
          }}
          sx={{ mb: 2 }}
        />
        
        <Button
          variant="contained"
          onClick={handleVerifyMFA}
          disabled={loading || verificationCode.length !== 6}
          fullWidth
        >
          {loading ? 'Verifying...' : 'Verify and Enable'}
        </Button>
        
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      </Paper>
    );
  }

  if (step === 'complete') {
    return (
      <Paper elevation={3} sx={{ p: 4, maxWidth: 600, mx: 'auto' }}>
        <Alert severity="success" sx={{ mb: 3 }}>
          Two-Factor Authentication has been enabled successfully!
        </Alert>
        
        <Typography variant="h6" gutterBottom>
          Save Your Backup Codes
        </Typography>
        
        <Typography variant="body2" color="text.secondary" paragraph>
          Store these backup codes in a safe place. You can use them to access your account if you lose your authenticator device.
        </Typography>
        
        <Paper variant="outlined" sx={{ p: 2, mb: 2, backgroundColor: 'grey.50' }}>
          <Grid container spacing={1}>
            {backupCodes.map((code, index) => (
              <Grid item xs={6} key={index}>
                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                  {code}
                </Typography>
              </Grid>
            ))}
          </Grid>
        </Paper>
        
        <Button
          variant="contained"
          onClick={downloadBackupCodes}
          fullWidth
        >
          Download Backup Codes
        </Button>
        
        <Alert severity="warning" sx={{ mt: 2 }}>
          Each backup code can only be used once. When you use a backup code, it will be marked as used.
        </Alert>
      </Paper>
    );
  }

  return null;
};

export default MFASetup;