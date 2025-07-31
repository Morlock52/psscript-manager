-- Migration to update categories with optimized categories for PowerShell scripts

-- First, truncate the existing categories table
TRUNCATE categories CASCADE;

-- Reset the sequence
ALTER SEQUENCE categories_id_seq RESTART WITH 1;

-- Insert the new categories
INSERT INTO categories (id, name, description, created_at, updated_at) 
VALUES 
  (1, 'System Administration', 'Scripts for managing Windows/Linux systems, including system configuration, maintenance, and monitoring.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (2, 'Security & Compliance', 'Scripts for security auditing, hardening, compliance checks, vulnerability scanning, and implementing security best practices.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (3, 'Automation & DevOps', 'Scripts that automate repetitive tasks, create workflows, CI/CD pipelines, and streamline IT processes.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (4, 'Cloud Management', 'Scripts for managing resources on Azure, AWS, GCP, and other cloud platforms, including provisioning and configuration.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (5, 'Network Management', 'Scripts for network configuration, monitoring, troubleshooting, and management of network devices and services.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (6, 'Data Management', 'Scripts for database operations, data processing, ETL (Extract, Transform, Load), and data analysis tasks.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (7, 'Active Directory', 'Scripts for managing Active Directory, user accounts, groups, permissions, and domain services.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (8, 'Monitoring & Diagnostics', 'Scripts for system monitoring, logging, diagnostics, performance analysis, and alerting.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (9, 'Backup & Recovery', 'Scripts for data backup, disaster recovery, system restore, and business continuity operations.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (10, 'Utilities & Helpers', 'General-purpose utility scripts, helper functions, and reusable modules for various administrative tasks.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Update any scripts that have categories that no longer exist to use the "Utilities & Helpers" category
UPDATE scripts SET category_id = 10 WHERE category_id IS NOT NULL AND category_id NOT IN (1, 2, 3, 4, 5, 6, 7, 8, 9, 10);
