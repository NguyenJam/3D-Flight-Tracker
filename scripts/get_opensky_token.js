#!/usr/bin/env node
// Small helper script to fetch an OpenSky OAuth2 client-credentials token using
// the local credentials.json file. Run locally (node >=18 recommended).
// Usage: node scripts/get_opensky_token.js
// Output: prints the access token to stdout.

import fs from 'fs';
import path from 'path';

async function main(){
  try{
    const credPath = path.resolve(process.cwd(), 'credentials.json');
    if(!fs.existsSync(credPath)){
      console.error('credentials.json not found at', credPath);
      process.exit(2);
    }
    const raw = fs.readFileSync(credPath, 'utf8');
    const creds = JSON.parse(raw);
    const clientId = creds.clientId;
    const clientSecret = creds.clientSecret;
    if(!clientId || !clientSecret){
      console.error('clientId or clientSecret missing from credentials.json');
      process.exit(2);
    }

    const params = new URLSearchParams();
    params.append('grant_type','client_credentials');
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);

    // Use global fetch (Node 18+) or fallback to node-fetch if available
    const fetchFn = global.fetch || (await import('node-fetch')).default;

    const res = await fetchFn('https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });

    if(!res.ok){
      const body = await res.text();
      console.error('Token request failed', res.status, body);
      process.exit(3);
    }

    const j = await res.json();
    if(!j.access_token){
      console.error('No access_token in response', j);
      process.exit(4);
    }

    // Print only the token to stdout so it can be captured by the caller
    console.log(j.access_token);
  }catch(err){
    console.error('Error fetching token:', err.message || err);
    process.exit(1);
  }
}

main();
