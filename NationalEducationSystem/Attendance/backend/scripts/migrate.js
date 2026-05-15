const { sequelize } = require('../config/database');
const fs = require('fs');
const path = require('path');

async function migrateDatabase() {
  try {
    console.log('Starting database migration...');

    // Create database if it doesn't exist
    const { Client } = require('pg');
    const client = new Client({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      database: 'postgres', // Connect to default database first
    });

    await client.connect();

    // Check if database exists
    const dbCheck = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [process.env.DB_NAME || 'kenya_attendance']
    );

    if (dbCheck.rows.length === 0) {
      console.log('Creating database...');
      await client.query(`CREATE DATABASE "${process.env.DB_NAME || 'kenya_attendance'}"`);
      console.log('Database created successfully');
    }

    await client.end();

    // Sync all models
    console.log('Syncing models...');
    await sequelize.sync({ force: false }); // Set to true to drop and recreate tables
    console.log('Models synced successfully');

    // Run seed data if needed
    if (process.argv.includes('--seed')) {
      await seedDatabase();
    }

    console.log('Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

async function seedDatabase() {
  try {
    console.log('Seeding database...');

    const { User, School } = require('../models');

    // Create default super admin
    const superAdmin = await User.findOrCreate({
      where: { email: 'admin@education.go.ke' },
      defaults: {
        email: 'admin@education.go.ke',
        password: 'Admin123!',
        firstName: 'Super',
        lastName: 'Admin',
        role: 'Super Admin',
        isActive: true,
      },
    });

    console.log('Super admin created:', superAdmin[0].email);

    // Create sample schools
    const sampleSchools = [
      {
        name: 'Nairobi Primary School',
        code: 'NPS001',
        type: 'Primary',
        county: 'Nairobi',
        subCounty: 'Westlands',
        address: '123 Education Street, Nairobi',
        capitationRate: 15000,
      },
      {
        name: 'Mombasa Secondary School',
        code: 'MSS001',
        type: 'Secondary',
        county: 'Mombasa',
        subCounty: 'Mvita',
        address: '456 Learning Avenue, Mombasa',
        capitationRate: 22000,
      },
    ];

    for (const schoolData of sampleSchools) {
      await School.findOrCreate({
        where: { code: schoolData.code },
        defaults: schoolData,
      });
    }

    console.log('Sample schools created');
    console.log('Seeding completed');
  } catch (error) {
    console.error('Seeding failed:', error);
    throw error;
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrateDatabase();
}

module.exports = { migrateDatabase, seedDatabase };