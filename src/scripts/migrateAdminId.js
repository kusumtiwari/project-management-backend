/**
 * Data Migration Script: Populate adminId for existing projects
 * 
 * This script fixes the data leakage issue by adding adminId to existing projects.
 * 
 * Run with: node src/scripts/migrateAdminId.js
 * 
 * CRITICAL: Backup your database before running this script!
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Project = require('../models/Project');
const User = require('../models/User');

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/project-management';

async function migrateAdminId() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get all projects without adminId
    console.log('\nFinding projects without adminId...');
    const projectsWithoutAdmin = await Project.find({ adminId: { $exists: false } });
    console.log(`Found ${projectsWithoutAdmin.length} projects without adminId`);

    if (projectsWithoutAdmin.length === 0) {
      console.log('No migration needed - all projects already have adminId');
      return;
    }

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const project of projectsWithoutAdmin) {
      try {
        // Try to find the admin from createdBy
        let adminId = null;

        if (project.createdBy) {
          const creator = await User.findById(project.createdBy);
          if (creator && (creator.isAdmin || creator.isSuperAdmin)) {
            adminId = creator._id;
          }
        }

        // Fallback: Find any admin associated with the project's teams
        if (!adminId) {
          const TeamSetup = require('../models/TeamSetup');
          const teamIds = project.teams?.map(t => t.teamId) || (project.teamId ? [project.teamId] : []);
          
          if (teamIds.length > 0) {
            // Find users who are admins and have this team
            const adminWithTeam = await User.findOne({
              isAdmin: true,
              'teams.teamId': { $in: teamIds }
            });
            
            if (adminWithTeam) {
              adminId = adminWithTeam._id;
            }
          }
        }

        // Last resort: Use the first admin in the system
        if (!adminId) {
          const anyAdmin = await User.findOne({ isAdmin: true, isSuperAdmin: false });
          if (anyAdmin) {
            adminId = anyAdmin._id;
            console.log(`  Warning: Using fallback admin for project ${project._id}`);
          }
        }

        if (!adminId) {
          throw new Error('Could not determine admin for project');
        }

        // Update the project with adminId
        await Project.findByIdAndUpdate(project._id, { adminId });
        successCount++;
        console.log(`  ✓ Updated project "${project.name}" with adminId: ${adminId}`);

      } catch (error) {
        errorCount++;
        errors.push({ projectId: project._id, error: error.message });
        console.error(`  ✗ Failed to update project ${project._id}: ${error.message}`);
      }
    }

    console.log('\n=== Migration Summary ===');
    console.log(`Total projects: ${projectsWithoutAdmin.length}`);
    console.log(`Successfully updated: ${successCount}`);
    console.log(`Errors: ${errorCount}`);

    if (errors.length > 0) {
      console.log('\nFailed projects:');
      errors.forEach(e => console.log(`  - ${e.projectId}: ${e.error}`));
    }

    // Add index to adminId if it doesn't exist
    console.log('\nEnsuring adminId index exists...');
    await Project.collection.createIndex({ adminId: 1 });
    console.log('Index created/verified');

    console.log('\n✅ Migration completed!');

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run if called directly
if (require.main === module) {
  migrateAdminId()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { migrateAdminId };

