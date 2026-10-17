const https = require('https');

const SUPABASE_URL = 'https://iehnwpvxohddgkzkqzyd.supabase.co';
const SUPABASE_KEY = 'sb_publishable_1TDI3iodXlM4rOKSR_xZng_ShMXRDz1';

function testLogin(email, password) {
  const data = JSON.stringify({ email, password });
  const url = new URL(`${SUPABASE_URL}/auth/v1/token?grant_type=password`);

  const req = https.request(url, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  }, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      console.log(`Login for ${email}:`, res.statusCode, body);
    });
  });

  req.on('error', (err) => console.error('Error:', err));
  req.write(data);
  req.end();
}

testLogin('merchant@polo.com', 'password123');
