import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

dotenv.config();

// Database configuration
const dbConfig: any = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'hr_system',
  user: process.env.DB_USER || 'postgres',
};

// Only add password if it's provided
if (process.env.DB_PASSWORD) {
  dbConfig.password = process.env.DB_PASSWORD;
}

const pool = new Pool(dbConfig);

// Create migrations tracking table if it doesn't exist
async function createMigrationsTable() {
  const query = `
    CREATE TABLE IF NOT EXISTS schema_migrations (
      migration_id SERIAL PRIMARY KEY,
      migration_name VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  
  try {
    await pool.query(query);
    console.log('✓ Migrations tracking table ready');
  } catch (error) {
    console.error('Error creating migrations table:', error);
    throw error;
  }
}

// Get list of applied migrations
async function getAppliedMigrations(): Promise<string[]> {
  const query = 'SELECT migration_name FROM schema_migrations ORDER BY migration_id';
  
  try {
    const result = await pool.query(query);
    return result.rows.map((row: any) => row.migration_name);
  } catch (error) {
    console.error('Error fetching applied migrations:', error);
    throw error;
  }
}

// Run a single migration file
async function runMigration(filepath: string, filename: string) {
  console.log(`\n📄 Running migration: ${filename}`);
  
  const sql = fs.readFileSync(filepath, 'utf8');
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log(`✓ Successfully applied: ${filename}`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`✗ Failed to apply ${filename}:`, error);
    throw error;
  } finally {
    client.release();
  }
}

// Main migration function
async function migrate() {
  console.log('🚀 Starting database migrations...\n');
  
  try {
    // Ensure migrations table exists
    await createMigrationsTable();
    
    // Get list of applied migrations
    const appliedMigrations = await getAppliedMigrations();
    console.log(`✓ Found ${appliedMigrations.length} previously applied migrations`);
    
    // Get list of migration files
    const migrationsDir = path.join(__dirname, '../../migrations');
    
    if (!fs.existsSync(migrationsDir)) {
      console.error('❌ Migrations directory not found:', migrationsDir);
      process.exit(1);
    }
    
    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Ensure migrations run in order
    
    console.log(`✓ Found ${files.length} migration files\n`);
    
    // Filter out already applied migrations
    const pendingMigrations = files.filter(file => {
      const fileNameWithoutExt = file.replace(/\.sql$/, '');
      return !appliedMigrations.includes(fileNameWithoutExt);
    });
    
    if (pendingMigrations.length === 0) {
      console.log('✓ All migrations are up to date! Nothing to do.\n');
      return;
    }
    
    console.log(`📋 Pending migrations: ${pendingMigrations.length}`);
    pendingMigrations.forEach(file => console.log(`   - ${file}`));
    console.log('');
    
    // Run pending migrations
    for (const file of pendingMigrations) {
      const filepath = path.join(migrationsDir, file);
      await runMigration(filepath, file);
    }
    
    console.log('\n✅ All migrations completed successfully!\n');
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migrations
migrate();
