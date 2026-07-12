const fs = require('fs');

async function testApi() {
  console.log("=== Testing Fleet Manager Access ===");
  // 1. Get CSRF token
  let res = await fetch('http://localhost:3000/api/auth/csrf');
  let csrfData = await res.json();
  let csrfToken = csrfData.csrfToken;
  let cookies = res.headers.get('set-cookie');
  
  // 2. Login
  const loginBody = new URLSearchParams({
    csrfToken,
    email: 'fleet@example.com',
    password: 'admin123',
    json: 'true'
  });
  
  res = await fetch('http://localhost:3000/api/auth/callback/credentials', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': cookies
    },
    body: loginBody
  });
  
  cookies = res.headers.get('set-cookie');
  let sessionCookie = '';
  if (cookies) {
    const match = cookies.match(/next-auth\.session-token=([^;]+)/);
    if (match) sessionCookie = `next-auth.session-token=${match[1]}`;
  }
  
  // 3. Test GET /api/vehicles
  console.log("Fetching /api/vehicles...");
  res = await fetch('http://localhost:3000/api/vehicles', {
    headers: { 'Cookie': sessionCookie }
  });
  const vehicles = await res.json();
  console.log("Vehicles:", vehicles.map(v => v.regNumber));

  // 4. Test GET /api/drivers
  console.log("\nFetching /api/drivers...");
  res = await fetch('http://localhost:3000/api/drivers', {
    headers: { 'Cookie': sessionCookie }
  });
  const drivers = await res.json();
  console.log("Drivers:", drivers.map(d => `${d.name} (${d.status})`));

  // 5. Test PATCH /api/drivers/[id] as FLEET_MANAGER
  const alice = drivers.find(d => d.name === "Alice Johnson" || d.name === "Alice J.");
  if (alice) {
    console.log(`\nPatching driver ${alice.name}...`);
    res = await fetch(`http://localhost:3000/api/drivers/${alice.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie
      },
      body: JSON.stringify({ name: "Alice J." })
    });
    const updatedAlice = await res.json();
    console.log("Updated Alice:", updatedAlice.name);
  }

  console.log("\n=== Testing Safety Officer Access ===");
  
  // Login as safety officer
  res = await fetch('http://localhost:3000/api/auth/csrf');
  csrfData = await res.json();
  csrfToken = csrfData.csrfToken;
  cookies = res.headers.get('set-cookie');
  
  const loginBodySafety = new URLSearchParams({
    csrfToken,
    email: 'safety@example.com',
    password: 'admin123',
    json: 'true'
  });
  
  res = await fetch('http://localhost:3000/api/auth/callback/credentials', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': cookies
    },
    body: loginBodySafety
  });
  
  let safetyCookieStr = res.headers.get('set-cookie');
  let safetySessionCookie = '';
  if (safetyCookieStr) {
    const match = safetyCookieStr.match(/next-auth\.session-token=([^;]+)/);
    if (match) safetySessionCookie = `next-auth.session-token=${match[1]}`;
  }

  // Attempt to update name (Should fail for Safety Officer)
  if (alice) {
    console.log(`\nAttempting to patch driver name as Safety Officer...`);
    res = await fetch(`http://localhost:3000/api/drivers/${alice.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': safetySessionCookie
      },
      body: JSON.stringify({ name: "Hacked Name" })
    });
    console.log("Response status:", res.status);
    const body = await res.json();
    console.log("Response body:", body);

    console.log(`\nAttempting to update status & safety score as Safety Officer...`);
    res = await fetch(`http://localhost:3000/api/drivers/${alice.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': safetySessionCookie
      },
      body: JSON.stringify({ status: "ON_TRIP", safetyScore: 99 })
    });
    console.log("Response status:", res.status);
    const successBody = await res.json();
    console.log("Updated Driver:", successBody.name, successBody.status, successBody.safetyScore);
  }
}

testApi().catch(console.error);
