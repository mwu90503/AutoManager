require('dotenv').config();
const express = require('express');
const supabase = require('./supabaseClient');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.static('public'));

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.get('/config.js', (req, res) => {
  res.type('application/javascript');
  res.send(
    `window.COGNITO_USER_POOL_ID = ${JSON.stringify(process.env.COGNITO_USER_POOL_ID)};\n` +
    `window.COGNITO_CLIENT_ID = ${JSON.stringify(process.env.COGNITO_CLIENT_ID)};`
  );
});

app.get('/health/db', async (req, res) => {
  const { error } = await supabase.from('_supabase_migrations').select('*').limit(1);
  if (error && error.code !== 'PGRST205') {
    return res.status(500).json({ connected: false, error: error.message });
  }
  res.json({ connected: true });
});

app.get('/getusers', async (req, res) => {
  const { data, error } = await supabase.from('users').select('*');
  if (error) {
    return res.status(500).json({ error: error.message });
  }
  res.json(data);
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

module.exports = app;
