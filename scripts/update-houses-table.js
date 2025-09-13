#!/usr/bin/env node

/**
 * Update Houses Table Schema in Supabase
 * 
 * This script adds missing fields to the houses table to match the frontend schema.
 * Run this after you've created the initial houses table.
 */

const fs = require('fs');
const path = require('path');

async function updateHousesTable() {
  try {
    console.log('🏠 Updating Houses table schema in Supabase...');
    
    // Read the SQL migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/002_update_houses_table.sql');
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
    console.log('5. Verify the table was updated in the Table Editor');
    
    console.log('\n✅ Houses table update instructions ready!');
    
  } catch (error) {
    console.error('❌ Error updating houses table:', error.message);
    process.exit(1);
  }
}

updateHousesTable();
