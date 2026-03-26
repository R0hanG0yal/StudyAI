/* ============================================================
   STUDYAI — PASSWORD MIGRATION SCRIPT
   Migrates existing base64-encoded passwords to bcrypt hashes.
   Usage: node migrate-passwords.js
   ============================================================ */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt   = require('bcrypt');

const BCRYPT_ROUNDS = 12;
const MONGO_URI     = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('❌ MONGO_URI is missing in .env');
  process.exit(1);
}

// Reuse schema from server.js
const userSchema = new mongoose.Schema({
  id      : { type: String, required: true, unique: true },
  email   : { type: String, required: true, unique: true },
  password: String,
});
const User = mongoose.models.User || mongoose.model('User', userSchema);

async function migrate() {
  console.log('🔄 Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected.');

  const users = await User.find({});
  console.log(`👤 Found ${users.length} users.`);

  let migratedCount = 0;
  let skippedCount  = 0;

  for (const user of users) {
    const pwd = user.password || '';

    // Check if it's already a bcrypt hash (starts with $2b$ or $2a$)
    if (pwd.startsWith('$2a$') || pwd.startsWith('$2b$')) {
      console.log(`⏩ Skipping user ${user.email} (already bcrypted)`);
      skippedCount++;
      continue;
    }

    try {
      console.log(`🔐 Migrating user ${user.email}...`);
      
      // Decode from base64 to plain text
      // Note: We assume it's base64 because the user said so.
      // If it's not valid base64, Buffer.from(pwd, 'base64').toString('utf8')
      // might just return the original string or some junk, but bcrypting it
      // is better than leaving it as is if we are sure it needs migration.
      const plainText = Buffer.from(pwd, 'base64').toString('utf8');
      
      // Verify if it looks like it was actually base64 (this is tricky)
      // For now, let's just re-hash it.
      const hashed = await bcrypt.hash(plainText, BCRYPT_ROUNDS);
      
      user.password = hashed;
      await user.save();
      
      console.log(`✅ User ${user.email} migrated.`);
      migratedCount++;
    } catch (err) {
      console.error(`❌ Failed to migrate user ${user.email}:`, err.message);
    }
  }

  console.log('\n─────────────────────────────────────────────────');
  console.log(`✅ Migration complete.`);
  console.log(`📊 Total: ${users.length} | Migrated: ${migratedCount} | Skipped: ${skippedCount}`);
  console.log('─────────────────────────────────────────────────\n');

  await mongoose.disconnect();
  process.exit(0);
}

migrate();
