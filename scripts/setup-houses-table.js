#!/usr/bin/env node

/**
 * Setup Houses Table in Supabase
 * 
 * This script creates the houses table in your Supabase database.
 * Run this after you've created your Supabase project and added credentials to .env.local
 */

const fs = require('fs');
const path = require('path');

async function setupHousesTable() {
  try {
    console.log('🏠 Setting up Houses table in Supabase...');
    
    // Read the SQL migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/001_create_houses_table.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Migration SQL:');
    console.log('─'.repeat(50));
    console.log(sql);
    console.log('─'.repeat(50));
    
    console.log('\n📋 Next Steps:');
    console.log('1. Go to your Supabase project dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and paste the SQL above');
    console.log('4. Click "Run" to execute the migration');
    console.log('5. Verify the table was created in the Table Editor');
    
    console.log('\n✅ Houses table setup instructions ready!');
    
  } catch (error) {
    console.error('❌ Error setting up houses table:', error.message);
    process.exit(1);
  }
}

setupHousesTable();
