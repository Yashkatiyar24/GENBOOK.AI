import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '.env.local') });

// Get database connection details from environment variables
const dbConfig = {
  host: process.env.VITE_SUPABASE_URL?.replace(/^https?:\/\//, '').split(':')[0] || 'localhost',
  port: process.env.VITE_SUPABASE_PORT || 5432,
  database: process.env.VITE_SUPABASE_DB || 'postgres',
  user: process.env.VITE_SUPABASE_DB_USER || 'postgres',
  password: process.env.VITE_SUPABASE_DB_PASSWORD || '',
  ssl: process.env.VITE_SUPABASE_SSL === 'true' || false,
};

// Override with direct URL if provided
if (process.env.VITE_SUPABASE_DB_URL) {
  const url = new URL(process.env.VITE_SUPABASE_DB_URL);
  dbConfig.host = url.hostname;
  dbConfig.port = parseInt(url.port || '5432', 10);
  dbConfig.database = url.pathname.replace(/^\//, '');
  dbConfig.user = url.username;
  dbConfig.password = url.password;
  dbConfig.ssl = url.searchParams.get('sslmode') === 'require';
}

async function runMigrations() {
  const client = new Client(dbConfig);
  
  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected to database');
    
    // Read the migration files
    const migrationsDir = path.join(__dirname, 'migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Sort to run migrations in order
    
    console.log(`Found ${migrationFiles.length} migration files`);
    
    // Create a migrations table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        run_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    
    // Get already run migrations
    const { rows: completedMigrations } = await client.query('SELECT name FROM _migrations');
    const completedMigrationNames = new Set(completedMigrations.map(m => m.name));
    
    // Execute each migration file
    for (const file of migrationFiles) {
      if (completedMigrationNames.has(file)) {
        console.log(`Skipping already applied migration: ${file}`);
        continue;
      }
      
      const filePath = path.join(migrationsDir, file);
      console.log(`\nRunning migration: ${file}`);
      
      try {
        // Read the SQL file
        const sql = fs.readFileSync(filePath, 'utf8');
        
        // Split into individual statements and execute them in a transaction
        await client.query('BEGIN');
        
        const statements = sql
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0);
        
        for (const statement of statements) {
          if (!statement.trim()) continue;
          const shortStatement = statement.substring(0, 100).replace(/\s+/g, ' ').trim();
          console.log(`Executing: ${shortStatement}...`);
          
          try {
            await client.query(statement);
          } catch (err) {
            console.error(`Error executing statement: ${err.message}`);
            throw err; // This will trigger the transaction rollback
          }
        }
        
        // Record the migration as completed
        await client.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        
        console.log(`✅ Successfully applied migration: ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`❌ Error applying migration ${file}:`, err.message);
        throw err; // Stop execution on error
      }
    }
    
    console.log('\nAll migrations completed successfully!');
  } catch (error) {
    console.error('Fatal error running migrations:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run the migrations
runMigrations().catch(console.error);
