import React, { useState, useEffect } from 'react';
import { useSessions } from '../../hooks/useEnhancedAuth';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Alert,
  Box,
  Tooltip
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Computer as ComputerIcon,
  Smartphone as SmartphoneIcon,
  Tablet as TabletIcon,
  DeviceUnknown as UnknownIcon
} from '@mui/icons-material';
import { format, formatDistanceToNow } from 'date-fns';

interface Session {
  sessionId: string;
  userId: number;
  ipAddress?: string;
  userAgent?: string;
  lastActivity: Date;
  expiresAt: Date;
  isActive: boolean;
}

export const SessionManager: React.FC = () => {
  const { currentSessionId, getSessions, revokeSession } = useSessions();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);

  const loadSessions = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const sessionList = await getSessions();
      setSessions(sessionList);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const handleRevokeSession = async (sessionId: string) => {
    setError(null);
    
    try {
      await revokeSession(sessionId);
      setConfirmRevoke(null);
      
      // Reload sessions if not revoking current session
      if (sessionId !== currentSessionId) {
        await loadSessions();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to revoke session');
      setConfirmRevoke(null);
    }
  };

  const getDeviceIcon = (userAgent?: string) => {
    if (!userAgent) return <UnknownIcon />;
    
    const ua = userAgent.toLowerCase();
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      return <SmartphoneIcon />;
    }
    if (ua.includes('tablet') || ua.includes('ipad')) {
      return <TabletIcon />;
    }
    return <ComputerIcon />;
  };

  const getDeviceInfo = (userAgent?: string) => {
    if (!userAgent) return 'Unknown Device';
    
    // Simple parsing - could be enhanced with a UA parser library
    const ua = userAgent.toLowerCase();
    const parts = [];
    
    // Browser
    if (ua.includes('chrome')) parts.push('Chrome');
    else if (ua.includes('firefox')) parts.push('Firefox');
    else if (ua.includes('safari')) parts.push('Safari');
    else if (ua.includes('edge')) parts.push('Edge');
    
    // OS
    if (ua.includes('windows')) parts.push('Windows');
    else if (ua.includes('mac')) parts.push('macOS');
    else if (ua.includes('linux')) parts.push('Linux');
    else if (ua.includes('android')) parts.push('Android');
    else if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) parts.push('iOS');
    
    return parts.join(' • ') || 'Unknown Device';
  };

  if (loading && sessions.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography>Loading sessions...</Typography>
      </Box>
    );
  }

  return (
    <>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          Active Sessions
        </Typography>
        
        <Typography variant="body2" color="text.secondary" paragraph>
          These are all the devices currently logged into your account. You can revoke access to any device.
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Device</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Last Activity</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sessions.map((session) => (
                <TableRow key={session.sessionId}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getDeviceIcon(session.userAgent)}
                      <div>
                        <Typography variant="body2">
                          {getDeviceInfo(session.userAgent)}
                        </Typography>
                        {session.sessionId === currentSessionId && (
                          <Chip
                            label="Current Session"
                            size="small"
                            color="primary"
                            sx={{ mt: 0.5 }}
                          />
                        )}
                      </div>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {session.ipAddress || 'Unknown'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Tooltip title={format(session.lastActivity, 'PPpp')}>
                      <Typography variant="body2">
                        {formatDistanceToNow(session.lastActivity, { addSuffix: true })}
                      </Typography>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={session.isActive ? 'Active' : 'Inactive'}
                      size="small"
                      color={session.isActive ? 'success' : 'default'}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title={session.sessionId === currentSessionId ? 'This will log you out' : 'Revoke session'}>
                      <IconButton
                        onClick={() => setConfirmRevoke(session.sessionId)}
                        color={session.sessionId === currentSessionId ? 'warning' : 'default'}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {sessions.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="text.secondary">
              No active sessions found
            </Typography>
          </Box>
        )}
      </Paper>

      <Dialog
        open={!!confirmRevoke}
        onClose={() => setConfirmRevoke(null)}
      >
        <DialogTitle>Revoke Session?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {confirmRevoke === currentSessionId
              ? 'This will log you out of your current session. You will need to log in again.'
              : 'This will revoke access for this device. The user of this device will need to log in again.'}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmRevoke(null)}>
            Cancel
          </Button>
          <Button
            onClick={() => confirmRevoke && handleRevokeSession(confirmRevoke)}
            color="error"
            variant="contained"
          >
            Revoke Session
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default SessionManager;