-- =============================================
-- RICTMS Compliance Hub - Complete Database Setup
-- This script creates the database, schema, and seed data
-- Run this in MySQL Workbench with XAMPP MariaDB
-- =============================================

-- Step 1: Create Database
DROP DATABASE IF EXISTS compliance_hub;
CREATE DATABASE compliance_hub CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE compliance_hub;

SELECT 'Step 1: Database created' AS Status;

-- Step 2: Create Tables (from schema.sql)
SOURCE ./schema.sql;

SELECT 'Step 2: Schema loaded' AS Status;

-- Step 3: Load Seed Data (from seed.sql)  
SOURCE ./seed.sql;

SELECT 'Step 3: Seed data loaded' AS Status;

-- Display final summary
SELECT 'Database setup complete!' AS Status;
SELECT COUNT(*) AS 'Users' FROM users;
SELECT COUNT(*) AS 'Units' FROM units;
SELECT COUNT(*) AS 'Documents' FROM documents;
SELECT COUNT(*) AS 'Issuances' FROM issuances;
SELECT COUNT(*) AS 'Tickets' FROM tickets;

SELECT '===========================================================' AS '';
SELECT 'Default Login Credentials:' AS '';
SELECT 'Username: admin' AS '';
SELECT 'Password: Admin123!' AS '';
SELECT '===========================================================' AS '';
