import fs from 'fs';
import https from 'https';

// Read the SQL file
const sqlContent = fs.readFileSync('COMPLETE_MENTION_SYSTEM_FIX.sql', 'utf8');

// Supabase connection details
const SUPABASE_URL = 'https://nhxjashreguofalhaofj.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5oeGphc2hyZWd1b2ZhbGhhb2ZqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzUwODg0NCwiZXhwIjoyMDU5MDg0ODQ0fQ.EZWUlp5MkaMBohd8VZEf_2qUO8xYz1jofkaAw1ITilQ';

// Split the SQL into individual statements
const statements = sqlContent
  .split(';')
  .map(stmt => stmt.trim())
  .filter(stmt => stmt && !stmt.startsWith('--') && stmt !== '')
  .map(stmt => stmt + ';');

console.log(`Found ${statements.length} SQL statements to execute`);

// Function to execute a single SQL statement
async function executeSql(sql) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ query: sql });
    
    const options = {
      hostname: 'nhxjashreguofalhaofj.supabase.co',
      path: '/rest/v1/rpc/exec_sql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`✓ SQL executed successfully: ${sql.substring(0, 50)}...`);
          resolve(data);
        } else {
          console.error(`✗ Error executing SQL: ${res.statusCode} ${res.statusMessage}`);
          console.error('Response:', data);
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      console.error('Request error:', error);
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

// Execute all statements
async function executeAllStatements() {
  console.log('Starting SQL execution...');
  
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    console.log(`\nExecuting statement ${i + 1}/${statements.length}:`);
    console.log(statement.substring(0, 100) + '...');
    
    try {
      await executeSql(statement);
      // Small delay between statements
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`Failed to execute statement ${i + 1}:`, error.message);
      console.error('Statement was:', statement);
      // Continue with next statement instead of stopping
      continue;
    }
  }
  
  console.log('\n🎉 All SQL statements execution completed!');
}

executeAllStatements().catch(console.error);