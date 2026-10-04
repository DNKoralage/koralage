/**
 * scripts/create-admin.js
 * CLI Utility to create an admin user or reset the admin password securely.
 * 
 * Usage:
 *   node scripts/create-admin.js [username] [password]
 * Example:
 *   node scripts/create-admin.js admin MySecurePassword123!
 */

const readline = require('readline');
const db = require('../lib/db');
const { hashPassword } = require('../lib/auth');

function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise(resolve => {
    rl.question(question, ans => {
      rl.close();
      resolve(ans.trim());
    });
  });
}

async function run() {
  console.log('=== Devnith Portfolio CMS: Admin User Setup ===\n');

  let username = process.argv[2];
  let password = process.argv[3];

  if (!username) {
    username = await prompt('Enter Admin Username (default: admin): ') || 'admin';
  }
  if (!password) {
    password = await prompt('Enter New Admin Password: ');
  }

  if (!password || password.length < 8) {
    console.error('Error: Password must be at least 8 characters long.');
    process.exit(1);
  }

  const usersCol = db.collection('users');
  const existing = usersCol.findOne({ username });

  const passwordHash = hashPassword(password);

  if (existing) {
    usersCol.updateOne({ id: existing.id }, { passwordHash, updatedAt: new Date().toISOString() });
    console.log(`\n✓ Success: Password for existing admin "${username}" has been updated.`);
  } else {
    usersCol.insertOne({
      username,
      email: 'dnkoralage@gmail.com',
      role: 'admin',
      passwordHash,
      name: 'Devnith Koralage'
    });
    console.log(`\n✓ Success: New admin user "${username}" has been created.`);
  }

  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  console.log(`You can now log in at ${appUrl}/admin/\n`);
}

run().catch(err => {
  console.error('Failed to set admin user:', err);
  process.exit(1);
});
