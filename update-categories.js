// Script to update categories in the database
const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load environment variables
dotenv.config();

// Database connection parameters
// Database connection parameters
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '5432');
const DB_NAME = process.env.DB_NAME || 'psscript';
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || 'postgres';

// Categories to ensure exist
const recommendedCategories = [
  {
    name: "System Administration",
    description: "Scripts for managing Windows/Linux systems, including system configuration, maintenance, and monitoring."
  },
  {
    name: "Security & Compliance",
    description: "Scripts for security auditing, hardening, compliance checks, vulnerability scanning, and implementing security best practices."
  },
  {
    name: "Automation & DevOps",
    description: "Scripts that automate repetitive tasks, create workflows, CI/CD pipelines, and streamline IT processes."
  },
  {
    name: "Cloud Management",
    description: "Scripts for managing resources on Azure, AWS, GCP, and other cloud platforms, including provisioning and configuration."
  },
  {
    name: "Network Management",
    description: "Scripts for network configuration, monitoring, troubleshooting, and management of network devices and services."
  },
  {
    name: "Data Management",
    description: "Scripts for database operations, data processing, ETL (Extract, Transform, Load), and data analysis tasks."
  },
  {
    name: "Active Directory",
    description: "Scripts for managing Active Directory, user accounts, groups, permissions, and domain services."
  },
  {
    name: "Monitoring & Diagnostics",
    description: "Scripts for system monitoring, logging, diagnostics, performance analysis, and alerting."
  },
  {
    name: "Backup & Recovery",
    description: "Scripts for data backup, disaster recovery, system restore, and business continuity operations."
  },
  {
    name: "Utilities & Helpers",
    description: "General-purpose utility scripts, helper functions, and reusable modules for various administrative tasks."
  }
];

// Initialize Sequelize
const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  port: DB_PORT,
  dialect: 'postgres',
  logging: console.log
});

async function updateCategories() {
  try {
    // Test connection
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');

    // Check if categories table exists
    const [tables] = await sequelize.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'categories'"
    );
    
    if (tables.length === 0) {
      console.log('Categories table does not exist. Creating it...');
      await sequelize.query(`
        CREATE TABLE categories (
          id SERIAL PRIMARY KEY,
          name VARCHAR(50) NOT NULL UNIQUE,
          description TEXT
        );
      `);
      console.log('Categories table created.');
    }

    // Get all existing categories
    const existingCategories = await sequelize.query(
      'SELECT id, name, description FROM categories',
      {
        type: Sequelize.QueryTypes.SELECT
      }
    );
    
    console.log(`Found ${existingCategories.length} existing categories`);
    
    // Update or insert categories
    for (const recommendedCategory of recommendedCategories) {
      // Check if a similar category already exists
      const existingCategory = existingCategories.find(c => 
        c.name.toLowerCase() === recommendedCategory.name.toLowerCase() ||
        c.name.toLowerCase().includes(recommendedCategory.name.toLowerCase().split(' ')[0])
      );
      
      try {
        if (existingCategory) {
          // Update existing category with improved description if needed
          if (existingCategory.description !== recommendedCategory.description) {
            await sequelize.query(
              'UPDATE categories SET description = :description WHERE id = :id',
              {
                replacements: {
                  id: existingCategory.id,
                  description: recommendedCategory.description
                },
                type: Sequelize.QueryTypes.UPDATE
              }
            );
            console.log(`Updated category: ${existingCategory.name} with improved description`);
          } else {
            console.log(`Category already exists with good description: ${existingCategory.name}`);
          }
        } else {
          // Insert new category
          await sequelize.query(
            'INSERT INTO categories (name, description) VALUES (:name, :description)',
            {
              replacements: {
                name: recommendedCategory.name,
                description: recommendedCategory.description
              },
              type: Sequelize.QueryTypes.INSERT
            }
          );
          console.log(`Inserted new category: ${recommendedCategory.name}`);
        }
      } catch (err) {
        console.error(`Error processing category ${recommendedCategory.name}:`, err.message);
      }
    }

    console.log('All categories have been updated successfully.');
  } catch (error) {
    console.error('Error updating categories:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the update function
updateCategories();
