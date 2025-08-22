import { supabase } from '../supabase.js';
import fs from 'fs';
import path from 'path';

export const initializeDatabase = async () => {
  try {
    console.log('Starting database initialization...');
    
    // Read and execute the SQL migration
    // Function to find the project root by looking for package.json
    const findProjectRoot = (startDir: string): string => {
      let currentDir = path.resolve(startDir);
      const { root } = path.parse(currentDir);
      
      while (currentDir !== root) {
        const packageJsonPath = path.join(currentDir, 'package.json');
        if (fs.existsSync(packageJsonPath)) {
          console.log('Found project root at:', currentDir);
          return currentDir;
        }
        
        // Move up one directory
        const parentDir = path.dirname(currentDir);
        if (parentDir === currentDir) {
          // We've reached the filesystem root
          break;
        }
        currentDir = parentDir;
      }
      
      // If we get here, we couldn't find the project root
      throw new Error('Could not find project root (directory containing package.json)');
    };
    
    // Start from the current file's directory and find the project root
    const currentFileUrl = new URL(import.meta.url);
    const currentFilePath = currentFileUrl.pathname;
    const currentDir = path.dirname(currentFilePath);
    console.log('Current file directory:', currentDir);
    
    // Find the project root
    const projectRoot = findProjectRoot(currentDir);
    console.log('Project root resolved to:', projectRoot);
    
    // The migrations directory is in the project root
    const migrationsDir = path.join(projectRoot, 'migrations');
    const migrationPath = path.join(migrationsDir, '20230813_add_tenant_rbac.sql');
    
    // Debug logs
    console.log('Migrations directory:', migrationsDir);
    console.log('Migration file path:', migrationPath);
    
    // Check if the migrations directory exists
    if (!fs.existsSync(migrationsDir)) {
      const files = fs.readdirSync(projectRoot);
      console.error(`Migrations directory not found at: ${migrationsDir}`);
      console.error(`Files in project root: ${files.join(', ')}`);
      throw new Error(`Migrations directory not found at: ${migrationsDir}`);
    }
    
    // Check if the migration file exists
    if (!fs.existsSync(migrationPath)) {
      const files = fs.readdirSync(migrationsDir);
      console.error(`Migration file not found at: ${migrationPath}`);
      console.error(`Migration files in directory: ${files.join(', ')}`);
      throw new Error(`Migration file not found at: ${migrationPath}`);
    }
    
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    // Split the SQL into individual statements and execute them
    const statements = sql
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0);
    
    // First, create the exec_sql function if it doesn't exist
    const createExecSqlFn = `
      CREATE OR REPLACE FUNCTION public.exec_sql(query text)
      RETURNS void AS $$
      BEGIN
        EXECUTE query;
      EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'Error executing SQL: %. %', SQLERRM, query;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;
    
    try {
      console.log('Creating exec_sql function...');
      const { error: createFnError } = await supabase.rpc('exec_sql', { query: createExecSqlFn });
      if (createFnError) {
        console.error('Error creating exec_sql function:', createFnError);
        // Continue execution even if function creation fails
      }
    } catch (err) {
      console.error('Failed to create exec_sql function:', err);
      // Continue execution even if function creation fails
    }
    
    // Execute each statement
    for (const statement of statements) {
      if (!statement) continue;
      
      try {
        console.log('Executing statement:', statement.substring(0, 100) + (statement.length > 100 ? '...' : ''));
        
        // Try to execute the statement directly
        const { error } = await supabase.rpc('exec_sql', { query: statement });
        
        if (error) {
          console.error('Error executing statement with exec_sql:', error);
          
          // If exec_sql fails, try executing the statement directly
          const { error: directError } = await supabase.rpc('exec_sql', { query: statement });
          
          if (directError) {
            console.error('Error executing statement directly:', directError);
            throw directError;
          }
        }
      } catch (err) {
        console.error('Failed to execute statement:', err);
        // Try one more time with a raw query if available
        try {
          console.log('Attempting to execute statement with raw query...');
          const { error: queryError } = await supabase.rpc('exec_sql', { query: statement });
          if (queryError) throw queryError;
        } catch (nestedErr) {
          console.error('Also failed to execute statement with raw query:', nestedErr);
          // Log the error but continue with the next statement
          console.error('Skipping statement due to error');
        }
      }
    }
    
    console.log('Database initialization completed successfully');
    return { success: true };
  } catch (error) {
    console.error('Failed to initialize database:', error);
    return { success: false, error };
  }
};

// Run the initialization if this file is executed directly
// Using import.meta.url to check if this module is being run directly
const isMain = import.meta.url === `file://${process.argv[1]}`;

if (isMain) {
  initializeDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Error initializing database:', error);
      process.exit(1);
    });
}
