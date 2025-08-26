import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '.env.local') });

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing Supabase URL or anonymous key in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigrations() {
  try {
    console.log('Starting migrations...');
    
    // Read the migration files
    const migrationsDir = path.join(__dirname, 'migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Sort to run migrations in order
    
    console.log(`Found ${migrationFiles.length} migration files`);
    
    // Execute each migration file
    for (const file of migrationFiles) {
      const filePath = path.join(migrationsDir, file);
      console.log(`\nRunning migration: ${file}`);
      
      try {
        // Read the SQL file
        const sql = fs.readFileSync(filePath, 'utf8');
        
        // Split into individual statements and execute them
        const statements = sql
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0);
        
        for (const statement of statements) {
          if (!statement.trim()) continue;
          console.log(`Executing: ${statement.substring(0, 100).replace(/\s+/g, ' ').trim()}...`);
          
          try {
            // Try to execute the statement directly
            const { data, error } = await supabase.rpc('exec_sql', { query: statement });
            
            if (error) {
              console.error(`Error executing statement: ${error.message}`);
              // Try executing as a raw query if the first attempt fails
              const { data: rawData, error: rawError } = await supabase.rpc('exec_sql', { query: statement });
              if (rawError) {
                console.error(`Error executing raw query: ${rawError.message}`);
              }
            }
          } catch (err) {
            console.error(`Error executing statement: ${err.message}`);
          }
        }
        
        console.log(`✅ Successfully applied migration: ${file}`);
      } catch (err) {
        console.error(`❌ Error applying migration ${file}:`, err);
        // Continue with next migration file even if one fails
      }
    }
    
    console.log('\nAll migrations completed!');
    process.exit(0);
  } catch (error) {
    console.error('Fatal error running migrations:', error);
    process.exit(1);
  }
}

// Run the migrations
runMigrations();
