# GDPR Implementation Guide for PSScript

## Quick Implementation Checklist

### Phase 1: Critical Legal Compliance (Week 1)
- [ ] Deploy Privacy Policy
- [ ] Deploy Terms of Service
- [ ] Deploy Cookie Policy
- [ ] Implement Cookie Consent Banner
- [ ] Add Privacy Policy acceptance on registration

### Phase 2: User Rights Implementation (Week 2-3)
- [ ] Data Export API endpoint
- [ ] Data Deletion API endpoint
- [ ] Data Rectification API endpoint
- [ ] User consent management system
- [ ] Automated data retention policies

### Phase 3: Technical Implementation (Week 3-4)
- [ ] Database encryption for PII
- [ ] Audit logging for data access
- [ ] Data Processing Records system
- [ ] Privacy by Design documentation
- [ ] Third-party processor agreements

## 1. Cookie Consent Banner Implementation

### Frontend Component (React/TypeScript)

```typescript
// src/frontend/src/components/CookieConsent.tsx
import React, { useState, useEffect } from 'react';
import { Button, Card, Checkbox, FormGroup, FormControlLabel } from '@mui/material';

interface CookiePreferences {
  essential: boolean;
  analytics: boolean;
  functionality: boolean;
}

export const CookieConsent: React.FC = () => {
  const [show, setShow] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    essential: true, // Always true, cannot be disabled
    analytics: false,
    functionality: false
  });

  useEffect(() => {
    const consent = localStorage.getItem('cookie_consent');
    if (!consent) {
      setShow(true);
    }
  }, []);

  const handleAcceptAll = () => {
    const allConsent = { essential: true, analytics: true, functionality: true };
    saveCookiePreferences(allConsent);
  };

  const handleAcceptSelected = () => {
    saveCookiePreferences(preferences);
  };

  const handleRejectAll = () => {
    const minimalConsent = { essential: true, analytics: false, functionality: false };
    saveCookiePreferences(minimalConsent);
  };

  const saveCookiePreferences = (prefs: CookiePreferences) => {
    localStorage.setItem('cookie_consent', JSON.stringify(prefs));
    localStorage.setItem('cookie_consent_date', new Date().toISOString());
    
    // Send to backend
    fetch('/api/privacy/cookie-consent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(prefs)
    });

    // Apply preferences
    if (!prefs.analytics) {
      // Disable Google Analytics
      window['ga-disable-GA_MEASUREMENT_ID'] = true;
    }

    setShow(false);
  };

  if (!show) return null;

  return (
    <Card className="cookie-consent-banner">
      <h3>Cookie Preferences</h3>
      <p>We use cookies to enhance your experience. Please select your preferences:</p>
      
      <FormGroup>
        <FormControlLabel
          control={<Checkbox checked={true} disabled />}
          label="Essential Cookies (Required for basic functionality)"
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={preferences.analytics}
              onChange={(e) => setPreferences({...preferences, analytics: e.target.checked})}
            />
          }
          label="Analytics Cookies (Help us improve our service)"
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={preferences.functionality}
              onChange={(e) => setPreferences({...preferences, functionality: e.target.checked})}
            />
          }
          label="Functionality Cookies (Remember your preferences)"
        />
      </FormGroup>

      <div className="cookie-actions">
        <Button onClick={handleRejectAll} variant="outlined">Reject All</Button>
        <Button onClick={handleAcceptSelected} variant="outlined">Accept Selected</Button>
        <Button onClick={handleAcceptAll} variant="contained" color="primary">Accept All</Button>
      </div>
      
      <a href="/cookie-policy" target="_blank">Learn more about our cookies</a>
    </Card>
  );
};
```

## 2. User Rights API Implementation

### Backend Endpoints (Express/TypeScript)

```typescript
// src/backend/src/routes/privacy.ts
import express from 'express';
import { authenticateJWT } from '../middleware/authMiddleware';
import PrivacyController from '../controllers/PrivacyController';

const router = express.Router();

// Data Export (GDPR Article 20 - Data Portability)
router.get('/export-data', authenticateJWT, PrivacyController.exportUserData);

// Data Deletion (GDPR Article 17 - Right to Erasure)
router.delete('/delete-account', authenticateJWT, PrivacyController.deleteAccount);

// Data Rectification (GDPR Article 16)
router.put('/update-personal-data', authenticateJWT, PrivacyController.updatePersonalData);

// Consent Management (GDPR Articles 6 & 7)
router.get('/consents', authenticateJWT, PrivacyController.getConsents);
router.post('/consents', authenticateJWT, PrivacyController.updateConsents);

// Data Processing Information (GDPR Article 13)
router.get('/processing-info', PrivacyController.getProcessingInfo);

export default router;
```

### Privacy Controller Implementation

```typescript
// src/backend/src/controllers/PrivacyController.ts
import { Request, Response } from 'express';
import { User, Script, Comment, ExecutionLog } from '../models';
import { generateDataExport } from '../services/DataExportService';
import logger from '../utils/logger';

export class PrivacyController {
  /**
   * Export all user data (GDPR Article 20)
   */
  static async exportUserData(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      
      // Collect all user data
      const userData = await User.findByPk(userId, {
        attributes: { exclude: ['password'] }
      });
      
      const scripts = await Script.findAll({ where: { userId } });
      const comments = await Comment.findAll({ where: { userId } });
      const executionLogs = await ExecutionLog.findAll({ where: { userId } });
      
      const exportData = {
        profile: userData,
        scripts: scripts,
        comments: comments,
        executionHistory: executionLogs,
        exportDate: new Date().toISOString(),
        exportFormat: 'JSON'
      };
      
      // Log data export for compliance
      await this.logPrivacyEvent(userId, 'data_export', {});
      
      res.json({
        success: true,
        data: exportData,
        message: 'Your data has been prepared for download'
      });
      
    } catch (error) {
      logger.error('Data export error:', error);
      res.status(500).json({ error: 'Failed to export data' });
    }
  }
  
  /**
   * Delete user account and all associated data (GDPR Article 17)
   */
  static async deleteAccount(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { password, reason } = req.body;
      
      // Verify password before deletion
      const user = await User.findByPk(userId);
      if (!user || !await user.validatePassword(password)) {
        res.status(401).json({ error: 'Invalid password' });
        return;
      }
      
      // Start transaction for data deletion
      const transaction = await sequelize.transaction();
      
      try {
        // Delete in order of dependencies
        await ExecutionLog.destroy({ where: { userId }, transaction });
        await Comment.destroy({ where: { userId }, transaction });
        await Script.destroy({ where: { userId }, transaction });
        await User.destroy({ where: { id: userId }, transaction });
        
        await transaction.commit();
        
        // Log deletion for compliance
        await this.logPrivacyEvent(userId, 'account_deletion', { reason });
        
        res.json({
          success: true,
          message: 'Your account has been permanently deleted'
        });
        
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
      
    } catch (error) {
      logger.error('Account deletion error:', error);
      res.status(500).json({ error: 'Failed to delete account' });
    }
  }
  
  /**
   * Update personal data (GDPR Article 16)
   */
  static async updatePersonalData(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { email, username } = req.body;
      
      const user = await User.findByPk(userId);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }
      
      // Update only allowed fields
      if (email) user.email = email;
      if (username) user.username = username;
      
      await user.save();
      
      await this.logPrivacyEvent(userId, 'data_rectification', { 
        fields: Object.keys(req.body) 
      });
      
      res.json({
        success: true,
        message: 'Personal data updated successfully'
      });
      
    } catch (error) {
      logger.error('Data update error:', error);
      res.status(500).json({ error: 'Failed to update data' });
    }
  }
  
  /**
   * Get user consents
   */
  static async getConsents(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      
      const consents = await UserConsent.findAll({
        where: { userId },
        order: [['createdAt', 'DESC']]
      });
      
      res.json({
        success: true,
        consents: consents
      });
      
    } catch (error) {
      logger.error('Get consents error:', error);
      res.status(500).json({ error: 'Failed to retrieve consents' });
    }
  }
  
  /**
   * Update user consents
   */
  static async updateConsents(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { marketing, analytics, functionality } = req.body;
      
      await UserConsent.create({
        userId,
        marketingEmails: marketing || false,
        analyticsTracking: analytics || false,
        functionalCookies: functionality || false,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
      
      await this.logPrivacyEvent(userId, 'consent_update', req.body);
      
      res.json({
        success: true,
        message: 'Consent preferences updated'
      });
      
    } catch (error) {
      logger.error('Update consents error:', error);
      res.status(500).json({ error: 'Failed to update consents' });
    }
  }
  
  /**
   * Get data processing information
   */
  static async getProcessingInfo(req: Request, res: Response): Promise<void> {
    res.json({
      controller: {
        name: '[COMPANY NAME]',
        email: 'privacy@psscript.com',
        address: '[COMPANY ADDRESS]'
      },
      dpo: {
        name: '[DPO NAME]',
        email: 'dpo@psscript.com'
      },
      purposes: [
        {
          purpose: 'Service Provision',
          legalBasis: 'Contract',
          dataTypes: ['Email', 'Username', 'Scripts'],
          retention: 'Duration of account'
        },
        {
          purpose: 'Security',
          legalBasis: 'Legitimate Interest',
          dataTypes: ['IP Address', 'Login History'],
          retention: '90 days'
        },
        {
          purpose: 'Analytics',
          legalBasis: 'Consent',
          dataTypes: ['Usage Statistics'],
          retention: '2 years'
        }
      ],
      rights: [
        'Right to Access',
        'Right to Rectification',
        'Right to Erasure',
        'Right to Restrict Processing',
        'Right to Data Portability',
        'Right to Object'
      ],
      thirdParties: [
        {
          name: 'AWS',
          purpose: 'Cloud Hosting',
          location: 'USA',
          safeguards: 'Standard Contractual Clauses'
        }
      ]
    });
  }
  
  /**
   * Log privacy-related events for compliance
   */
  private static async logPrivacyEvent(
    userId: number,
    eventType: string,
    eventData: any
  ): Promise<void> {
    try {
      await PrivacyAuditLog.create({
        userId,
        eventType,
        eventData: JSON.stringify(eventData),
        timestamp: new Date()
      });
    } catch (error) {
      logger.error('Failed to log privacy event:', error);
    }
  }
}
```

## 3. Database Schema Updates for GDPR

```sql
-- Create consent tracking table
CREATE TABLE user_consents (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    marketing_emails BOOLEAN DEFAULT false,
    analytics_tracking BOOLEAN DEFAULT false,
    functional_cookies BOOLEAN DEFAULT false,
    consent_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create privacy audit log
CREATE TABLE privacy_audit_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    event_type VARCHAR(50),
    event_data JSONB,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_privacy_audit_user (user_id),
    INDEX idx_privacy_audit_type (event_type)
);

-- Add GDPR fields to users table
ALTER TABLE users ADD COLUMN gdpr_consent_date TIMESTAMP;
ALTER TABLE users ADD COLUMN data_retention_date TIMESTAMP;
ALTER TABLE users ADD COLUMN deletion_requested_date TIMESTAMP;

-- Create data processing records table
CREATE TABLE data_processing_records (
    id SERIAL PRIMARY KEY,
    processing_activity VARCHAR(255),
    purpose TEXT,
    legal_basis VARCHAR(50),
    data_categories TEXT[],
    retention_period VARCHAR(100),
    recipients TEXT[],
    safeguards TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 4. Frontend Privacy Dashboard

```typescript
// src/frontend/src/pages/PrivacyDashboard.tsx
import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert
} from '@mui/material';
import { api } from '../services/api';

export const PrivacyDashboard: React.FC = () => {
  const [consents, setConsents] = useState({
    marketing: false,
    analytics: false,
    functionality: false
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadConsents();
  }, []);

  const loadConsents = async () => {
    try {
      const response = await api.get('/privacy/consents');
      if (response.data.consents.length > 0) {
        const latest = response.data.consents[0];
        setConsents({
          marketing: latest.marketingEmails,
          analytics: latest.analyticsTracking,
          functionality: latest.functionalCookies
        });
      }
    } catch (error) {
      console.error('Failed to load consents:', error);
    }
  };

  const handleConsentChange = async (type: string, value: boolean) => {
    setConsents({ ...consents, [type]: value });
    
    try {
      await api.post('/privacy/consents', {
        [type]: value
      });
    } catch (error) {
      console.error('Failed to update consent:', error);
    }
  };

  const handleDataExport = async () => {
    setLoading(true);
    try {
      const response = await api.get('/privacy/export-data');
      
      // Create download link
      const dataStr = JSON.stringify(response.data.data, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `psscript-data-export-${Date.now()}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    } catch (error) {
      console.error('Failed to export data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!password) return;
    
    setLoading(true);
    try {
      await api.delete('/privacy/delete-account', {
        data: { password }
      });
      
      // Logout and redirect
      localStorage.clear();
      window.location.href = '/';
    } catch (error) {
      console.error('Failed to delete account:', error);
      alert('Failed to delete account. Please check your password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="privacy-dashboard">
      <Typography variant="h4" gutterBottom>Privacy Settings</Typography>
      
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Cookie Preferences</Typography>
          
          <FormControlLabel
            control={
              <Switch
                checked={consents.marketing}
                onChange={(e) => handleConsentChange('marketing', e.target.checked)}
              />
            }
            label="Marketing Communications"
          />
          <Typography variant="body2" color="textSecondary" sx={{ ml: 4, mb: 2 }}>
            Receive emails about new features and updates
          </Typography>
          
          <FormControlLabel
            control={
              <Switch
                checked={consents.analytics}
                onChange={(e) => handleConsentChange('analytics', e.target.checked)}
              />
            }
            label="Analytics Tracking"
          />
          <Typography variant="body2" color="textSecondary" sx={{ ml: 4, mb: 2 }}>
            Help us improve by sharing anonymous usage data
          </Typography>
          
          <FormControlLabel
            control={
              <Switch
                checked={consents.functionality}
                onChange={(e) => handleConsentChange('functionality', e.target.checked)}
              />
            }
            label="Functionality Cookies"
          />
          <Typography variant="body2" color="textSecondary" sx={{ ml: 4 }}>
            Remember your preferences and recent activities
          </Typography>
        </CardContent>
      </Card>
      
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Your Data</Typography>
          
          <Button
            variant="outlined"
            onClick={handleDataExport}
            disabled={loading}
            sx={{ mr: 2 }}
          >
            Export My Data
          </Button>
          
          <Button
            variant="outlined"
            color="error"
            onClick={() => setDeleteDialogOpen(true)}
          >
            Delete My Account
          </Button>
          
          <Alert severity="info" sx={{ mt: 2 }}>
            You can request a copy of your data or permanently delete your account at any time.
          </Alert>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Privacy Rights</Typography>
          <Typography variant="body2" paragraph>
            Under GDPR and other privacy laws, you have the right to:
          </Typography>
          <ul>
            <li>Access your personal data</li>
            <li>Rectify inaccurate data</li>
            <li>Erase your data ("right to be forgotten")</li>
            <li>Restrict processing of your data</li>
            <li>Data portability</li>
            <li>Object to data processing</li>
          </ul>
          <Typography variant="body2">
            To exercise these rights, contact us at privacy@psscript.com
          </Typography>
        </CardContent>
      </Card>
      
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Account</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This action cannot be undone. All your data will be permanently deleted.
          </Alert>
          <TextField
            fullWidth
            type="password"
            label="Confirm Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleDeleteAccount}
            color="error"
            disabled={loading || !password}
          >
            Delete Account
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};
```

## 5. Automated Data Retention

```typescript
// src/backend/src/services/DataRetentionService.ts
import { Op } from 'sequelize';
import { CronJob } from 'cron';
import logger from '../utils/logger';

export class DataRetentionService {
  private static retentionPolicies = {
    executionLogs: 90, // days
    deletedUserData: 30, // days
    auditLogs: 365 * 2, // 2 years
    inactiveAccounts: 365 * 3 // 3 years
  };

  static initializeRetentionJobs(): void {
    // Run daily at 2 AM
    new CronJob('0 2 * * *', this.enforceRetentionPolicies, null, true);
    
    logger.info('Data retention jobs initialized');
  }

  private static async enforceRetentionPolicies(): Promise<void> {
    try {
      await this.cleanExecutionLogs();
      await this.cleanDeletedUserData();
      await this.notifyInactiveUsers();
      await this.anonymizeOldData();
      
      logger.info('Data retention policies enforced successfully');
    } catch (error) {
      logger.error('Data retention enforcement error:', error);
    }
  }

  private static async cleanExecutionLogs(): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.retentionPolicies.executionLogs);
    
    const deleted = await ExecutionLog.destroy({
      where: {
        createdAt: { [Op.lt]: cutoffDate }
      }
    });
    
    logger.info(`Deleted ${deleted} old execution logs`);
  }

  private static async cleanDeletedUserData(): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.retentionPolicies.deletedUserData);
    
    // Permanently delete soft-deleted user data
    await sequelize.query(`
      DELETE FROM users 
      WHERE deletion_requested_date IS NOT NULL 
      AND deletion_requested_date < :cutoffDate
    `, {
      replacements: { cutoffDate }
    });
  }

  private static async notifyInactiveUsers(): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.retentionPolicies.inactiveAccounts);
    
    const inactiveUsers = await User.findAll({
      where: {
        lastLoginAt: { [Op.lt]: cutoffDate },
        deletionNotificationSent: false
      }
    });
    
    for (const user of inactiveUsers) {
      // Send notification email
      await EmailService.sendDataRetentionNotice(user.email);
      user.deletionNotificationSent = true;
      await user.save();
    }
  }

  private static async anonymizeOldData(): Promise<void> {
    // Anonymize data instead of deleting for statistical purposes
    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - 5);
    
    await sequelize.query(`
      UPDATE comments 
      SET user_id = NULL, 
          content = 'Content removed for privacy'
      WHERE created_at < :cutoffDate
    `, {
      replacements: { cutoffDate }
    });
  }
}
```

## 6. Implementation Timeline

### Week 1: Legal Foundation
1. Deploy privacy policy, terms of service, cookie policy
2. Implement cookie consent banner
3. Add privacy policy acceptance to registration
4. Update email templates with privacy links

### Week 2: User Rights
1. Implement data export endpoint
2. Implement account deletion endpoint
3. Add privacy dashboard to frontend
4. Implement consent management

### Week 3: Technical Compliance
1. Add encryption for PII fields
2. Implement audit logging
3. Set up data retention automation
4. Create data processing records

### Week 4: Testing & Documentation
1. Test all GDPR features
2. Document data flows
3. Create incident response plan
4. Train team on privacy procedures

## 7. Monitoring & Maintenance

### Regular Tasks
- Monthly: Review and update data processing records
- Quarterly: Audit third-party processors
- Semi-annually: Review retention policies
- Annually: Conduct privacy impact assessment

### Key Metrics to Track
- Consent rates
- Data request response times
- Privacy policy acceptance rate
- Cookie consent choices
- Data deletion requests

## 8. Emergency Procedures

### Data Breach Response
1. Contain the breach
2. Assess the scope and impact
3. Notify authorities within 72 hours (GDPR requirement)
4. Notify affected users if high risk
5. Document everything
6. Implement preventive measures

### Regulatory Inquiry Response
1. Acknowledge receipt immediately
2. Assign privacy team
3. Gather requested documentation
4. Respond within deadline
5. Implement any required changes

---

This implementation guide provides a complete roadmap for achieving GDPR compliance. Regular reviews and updates are essential as regulations evolve.