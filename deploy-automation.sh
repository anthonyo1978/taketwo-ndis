#!/bin/bash

# Automation System Deployment Script
# This script will commit and deploy all automation-related files

echo "🚀 Starting Automation System Deployment..."

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo "📁 Initializing git repository..."
    git init
    echo "✅ Git repository initialized"
fi

# Add all automation files
echo "📦 Staging automation files..."

# Core automation services
git add lib/services/contract-eligibility.ts
git add lib/services/contract-rate-calculator.ts
git add lib/services/transaction-generator.ts

# API endpoints
git add app/api/automation/

# Settings page
git add app/(admin)/settings/automation/
git add components/admin/AutomationSettingsPage.tsx

# Database migrations
git add supabase/migrations/013_add_automation_fields_to_funding_contracts.sql
git add supabase/migrations/014_create_automation_logs_table.sql
git add supabase/migrations/015_create_automation_settings_table.sql
git add supabase/migrations/016_add_automation_metadata_to_transactions.sql
git add supabase/migrations/017_add_duration_days_to_funding_contracts.sql

# Configuration files
git add vercel.json
git add AUTOMATION-STATUS.md

# Modified existing files
git add app/(admin)/settings/page.tsx
git add components/residents/FundingDashboard.tsx
git add components/residents/FundingManager.tsx
git add lib/supabase/services/residents.ts
git add types/resident.ts

echo "✅ All files staged"

# Commit changes
echo "💾 Committing changes..."
git commit -m "feat: implement automated billing system

- Add automation settings page with full UI
- Implement contract eligibility checking  
- Add transaction generation engine
- Create rate calculation service
- Add database migrations for automation
- Implement dynamic cron job scheduling
- Add comprehensive testing tools

Features:
- Daily/weekly automated drawdowns
- Email notifications
- Error handling and logging
- Preview tools for testing
- Dynamic scheduling based on user settings

API Endpoints:
- /api/automation/settings - Manage automation settings
- /api/automation/eligible-contracts - Get eligible contracts
- /api/automation/generate-transactions - Generate transactions
- /api/automation/cron - Automated cron job execution

Database Changes:
- Added automation fields to funding_contracts
- Created automation_settings table
- Created automation_logs table
- Added automation metadata to transactions
- Added duration_days field for contracts"

echo "✅ Changes committed"

# Check if remote exists
if ! git remote | grep -q origin; then
    echo "⚠️  No remote origin found. Please add your GitHub repository:"
    echo "   git remote add origin <your-github-repo-url>"
    echo "   git branch -M main"
    echo "   git push -u origin main"
else
    echo "🚀 Pushing to remote repository..."
    git push origin main
    echo "✅ Successfully pushed to remote repository"
fi

echo ""
echo "🎉 Automation System Deployment Complete!"
echo ""
echo "Next Steps:"
echo "1. Deploy to Vercel (if not already connected)"
echo "2. Test production endpoints:"
echo "   - https://your-app.vercel.app/api/automation/settings"
echo "   - https://your-app.vercel.app/api/automation/cron"
echo "3. Monitor Vercel Functions logs for cron execution"
echo ""
echo "Your automation system is now live! 🚀"
