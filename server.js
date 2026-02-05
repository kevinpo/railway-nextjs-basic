const http = require('http');
const { Pool } = require('pg');

const PORT = process.env.PORT || 3000;

// Create Postgres connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

// Initialize database with test table
async function initDb() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS test_items (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insert sample data if table is empty
    const { rows } = await pool.query('SELECT COUNT(*) FROM test_items');
    if (parseInt(rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO test_items (name) VALUES
        ('Hello from Railway'),
        ('PostgreSQL is connected'),
        ('Test item 3')
      `);
      console.log('Inserted sample data');
    }
    console.log('Database initialized');
  } catch (err) {
    console.error('Database init error:', err.message);
  }
}

const server = http.createServer(async (req, res) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);

  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end('{"status":"ok"}');
    return;
  }

  if (req.url === '/db') {
    try {
      const { rows } = await pool.query('SELECT * FROM test_items ORDER BY id');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ items: rows }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // Home page
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`
    <h1>Hello World!</h1>
    <p>Deployed on Railway with PostgreSQL</p>
    <p><a href="/db">View database records</a></p>
    <p><a href="/health">Health check</a></p>
  `);
});

server.listen(PORT, '0.0.0.0', async () => {
  console.log(`Server listening on 0.0.0.0:${PORT}`);
  if (process.env.DATABASE_URL) {
    await initDb();
  } else {
    console.log('DATABASE_URL not set - database features disabled');
  }
});
