import { supabase } from '../supabase';
import fs from 'fs';
import path from 'path';

export const initializeDatabase = async () => {
  try {
    console.log('Starting database initialization...');
    
    // Read and execute the SQL migration
    const migrationPath = path.join(__dirname, '../../migrations/20230813_add_tenant_rbac.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    // Split the SQL into individual statements and execute them
    const statements = sql
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0);
    
    for (const statement of statements) {
      try {
        const { error } = await supabase.rpc('exec_sql', { query: statement + ';' });
        if (error) {
          console.error('Error executing statement:', statement.substring(0, 100) + '...');
          console.error('Error details:', error);
        }
      } catch (err) {
        console.error('Failed to execute statement:', err);
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
if (require.main === module) {
  initializeDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal error during initialization:', error);
      process.exit(1);
    });
}
