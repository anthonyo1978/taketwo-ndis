#!/usr/bin/env node

/**
 * Setup Residents Table in Supabase
 * 
 * This script creates the residents, funding_contracts, and audit_trail tables.
 * Run this after you've created the houses table.
 */

const fs = require('fs');
const path = require('path');

async function setupResidentsTable() {
  try {
    console.log('👥 Setting up Residents tables in Supabase...');
    
    // Read the SQL migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/003_create_residents_table.sql');
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
    console.log('5. Verify the tables were created in the Table Editor');
    console.log('   - residents');
    console.log('   - funding_contracts');
    console.log('   - resident_audit_trail');
    
    console.log('\n✅ Residents table setup instructions ready!');
    
  } catch (error) {
    console.error('❌ Error setting up residents table:', error.message);
    process.exit(1);
  }
}

setupResidentsTable();

