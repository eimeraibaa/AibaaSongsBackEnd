import 'dotenv/config';
import Sequelize from 'sequelize';
import { readFileSync } from 'fs';
import { join } from 'path';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ ERROR: Set DATABASE_URL in your environment before running migrations');
  process.exit(1);
}

const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
});

async function run() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to DB');

    const migrations = [
      'add_song_feedback_table.sql',
      'add_shared_songs_table.sql'
    ];

    for (const m of migrations) {
      const path = join(process.cwd(), 'migrations', m);
      console.log('🔄 Running', m);
      const sql = readFileSync(path, 'utf-8');
      await sequelize.query(sql);
      console.log('✅ Migration applied:', m);
    }

    console.log('🎉 All new migrations completed');
  } catch (err) {
    console.error('❌ Migration failed:', err.message || err);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

run();
