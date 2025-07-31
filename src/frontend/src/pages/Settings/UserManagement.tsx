import React, { useState, useEffect } from 'react';
import { 
  Typography, 
  Box, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  IconButton,
  Chip,
  Tooltip,
  CircularProgress
} from '@mui/material';
import { 
  PersonAdd as PersonAddIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
  Security as SecurityIcon,
  LockReset as LockResetIcon
} from '@mui/icons-material';
import SettingsLayout from './SettingsLayout';
// import { useAuth } from '../../hooks/useAuth'; // Removed
import api from '../../services/api';

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  last_login_at: string | null;
  created_at: string;
}

const UserManagement: React.FC = () => {
  // const { user: currentUser } = useAuth(); // Removed
  const currentUser = null; // No current user concept anymore
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openResetPasswordDialog, setOpenResetPasswordDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  // Form states
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('user');
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateDialog = () => {
    setNewUsername('');
    setNewEmail('');
    setNewPassword('');
    setNewRole('user');
    setFormError(null);
    setOpenCreateDialog(true);
  };

  const handleOpenEditDialog = (user: User) => {
    setSelectedUser(user);
    setNewUsername(user.username);
    setNewEmail(user.email);
    setNewPassword('');
    setNewRole(user.role);
    setFormError(null);
    setOpenEditDialog(true);
  };

  const handleOpenDeleteDialog = (user: User) => {
    setSelectedUser(user);
    setOpenDeleteDialog(true);
  };

  const handleOpenResetPasswordDialog = (user: User) => {
    setSelectedUser(user);
    setNewPassword('');
    setFormError(null);
    setOpenResetPasswordDialog(true);
  };

  const handleCreateUser = async () => {
    setFormError(null);
    
    if (!newUsername.trim() || !newEmail.trim() || !newPassword.trim()) {
      setFormError('All fields are required');
      return;
    }
    
    try {
      await api.post('/users', {
        username: newUsername,
        email: newEmail,
        password: newPassword,
        role: newRole
      });
      
      setSuccess('User created successfully');
      setOpenCreateDialog(false);
      fetchUsers();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error creating user:', err);
      setFormError(err.response?.data?.message || 'Failed to create user');
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    setFormError(null);
    
    if (!newUsername.trim() || !newEmail.trim()) {
      setFormError('Username and email are required');
      return;
    }
    
    try {
      const updateData: any = {
        username: newUsername,
        email: newEmail,
        role: newRole
      };
      
      // Only include password if it was provided
      if (newPassword.trim()) {
        updateData.password = newPassword;
      }
      
      await api.put(`/users/${selectedUser.id}`, updateData);
      
      setSuccess('User updated successfully');
      setOpenEditDialog(false);
      fetchUsers();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error updating user:', err);
      setFormError(err.response?.data?.message || 'Failed to update user');
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    
    try {
      await api.delete(`/users/${selectedUser.id}`);
      
      setSuccess('User deleted successfully');
      setOpenDeleteDialog(false);
      fetchUsers();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error deleting user:', err);
      setError(err.response?.data?.message || 'Failed to delete user');
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser) return;
    setFormError(null);
    
    if (!newPassword.trim()) {
      setFormError('Password is required');
      return;
    }
    
    try {
      await api.post(`/users/${selectedUser.id}/reset-password`, {
        password: newPassword
      });
      
      setSuccess('Password reset successfully');
      setOpenResetPasswordDialog(false);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error resetting password:', err);
      setFormError(err.response?.data?.message || 'Failed to reset password');
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  return (
    <SettingsLayout 
      title="User Management" 
      description="Add, edit, and manage user accounts for your application"
    >
      <Box mb={4}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}
        
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" component="h2">
            Users
          </Typography>
          
          <Box>
            <Tooltip title="Refresh users list">
              <IconButton onClick={fetchUsers} sx={{ mr: 1 }}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            
            <Button 
              variant="contained" 
              color="primary"
              startIcon={<PersonAddIcon />}
              onClick={handleOpenCreateDialog}
            >
              Add User
            </Button>
          </Box>
        </Box>
        
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Username</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Last Login</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <CircularProgress size={24} sx={{ my: 2 }} />
                    <Typography variant="body2" color="textSecondary">
                      Loading users...
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography variant="body2" color="textSecondary">
                      No users found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      {user.username}
                      {/* Removed "You" chip */}
                      {/* {currentUser?.id === String(user.id) && (
                        <Chip
                          label="You"
                          size="small"
                          color="primary" 
                          sx={{ ml: 1 }}
                        />
                      )} */}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Chip 
                        label={user.role} 
                        color={user.role === 'admin' ? 'error' : 'default'}
                        size="small"
                        icon={user.role === 'admin' ? <SecurityIcon /> : undefined}
                      />
                    </TableCell>
                    <TableCell>{formatDate(user.created_at)}</TableCell>
                    <TableCell>{formatDate(user.last_login_at)}</TableCell>
                    <TableCell>
                      <Tooltip title="Edit user">
                        <IconButton 
                          onClick={() => handleOpenEditDialog(user)}
                          size="small"
                          color="primary"
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      
                      <Tooltip title="Reset password">
                        <IconButton 
                          onClick={() => handleOpenResetPasswordDialog(user)}
                          size="small"
                          color="secondary"
                        >
                          <LockResetIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      {/* Removed self-delete check */}
                      {/* {currentUser?.id !== String(user.id) && ( */}
                        <Tooltip title="Delete user">
                          <IconButton
                            onClick={() => handleOpenDeleteDialog(user)}
                            size="small"
                            color="error"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      {/* )} */}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Create User Dialog */}
      <Dialog open={openCreateDialog} onClose={() => setOpenCreateDialog(false)}>
        <DialogTitle>Add New User</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Enter the details for the new user. The user will be able to log in with these credentials.
          </DialogContentText>
          
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError}
            </Alert>
          )}
          
          <TextField
            margin="dense"
            label="Username"
            fullWidth
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            sx={{ mb: 2 }}
          />
          
          <TextField
            margin="dense"
            label="Email"
            type="email"
            fullWidth
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            sx={{ mb: 2 }}
          />
          
          <TextField
            margin="dense"
            label="Password"
            type="password"
            fullWidth
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            sx={{ mb: 2 }}
          />
          
          <FormControl fullWidth margin="dense">
            <InputLabel id="role-select-label">Role</InputLabel>
            <Select
              labelId="role-select-label"
              value={newRole}
              label="Role"
              onChange={(e) => setNewRole(e.target.value)}
            >
              <MenuItem value="user">User</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreateDialog(false)} color="inherit">
            <CloseIcon fontSize="small" sx={{ mr: 1 }} />
            Cancel
          </Button>
          <Button onClick={handleCreateUser} color="primary" variant="contained">
            <CheckIcon fontSize="small" sx={{ mr: 1 }} />
            Create User
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)}>
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Update user information. Leave the password field empty to keep the current password.
          </DialogContentText>
          
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError}
            </Alert>
          )}
          
          <TextField
            margin="dense"
            label="Username"
            fullWidth
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            sx={{ mb: 2 }}
          />
          
          <TextField
            margin="dense"
            label="Email"
            type="email"
            fullWidth
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            sx={{ mb: 2 }}
          />
          
          <TextField
            margin="dense"
            label="Password (leave empty to keep current)"
            type="password"
            fullWidth
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            sx={{ mb: 2 }}
          />
          
          <FormControl fullWidth margin="dense">
            <InputLabel id="edit-role-select-label">Role</InputLabel>
            <Select
              labelId="edit-role-select-label"
              value={newRole}
              label="Role"
              onChange={(e) => setNewRole(e.target.value)}
              // disabled={currentUser?.id === String(selectedUser?.id)} // Removed self-role-change check
            >
              <MenuItem value="user">User</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
            </Select>
          </FormControl>

          {/* Removed self-role-change alert */}
          {/* {currentUser?.id === String(selectedUser?.id) && (
            <Alert severity="info" sx={{ mt: 2 }}>
              You cannot change your own role.
            </Alert>
          )} */}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditDialog(false)} color="inherit">
            <CloseIcon fontSize="small" sx={{ mr: 1 }} />
            Cancel
          </Button>
          <Button onClick={handleUpdateUser} color="primary" variant="contained">
            <CheckIcon fontSize="small" sx={{ mr: 1 }} />
            Update User
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
        <DialogTitle>Delete User</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the user <strong>{selectedUser?.username}</strong>? 
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)} color="inherit">
            <CloseIcon fontSize="small" sx={{ mr: 1 }} />
            Cancel
          </Button>
          <Button onClick={handleDeleteUser} color="error" variant="contained">
            <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
            Delete User
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={openResetPasswordDialog} onClose={() => setOpenResetPasswordDialog(false)}>
        <DialogTitle>Reset Password</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Enter a new password for user <strong>{selectedUser?.username}</strong>.
          </DialogContentText>
          
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError}
            </Alert>
          )}
          
          <TextField
            margin="dense"
            label="New Password"
            type="password"
            fullWidth
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenResetPasswordDialog(false)} color="inherit">
            <CloseIcon fontSize="small" sx={{ mr: 1 }} />
            Cancel
          </Button>
          <Button onClick={handleResetPassword} color="primary" variant="contained">
            <CheckIcon fontSize="small" sx={{ mr: 1 }} />
            Reset Password
          </Button>
        </DialogActions>
      </Dialog>
    </SettingsLayout>
  );
};

export default UserManagement;
