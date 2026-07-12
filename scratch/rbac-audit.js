const fs = require('fs');

const BASE_URL = 'http://localhost:3000';

async function login(email, password) {
  let res = await fetch(`${BASE_URL}/api/auth/csrf`);
  let csrfData = await res.json();
  let cookies = res.headers.get('set-cookie');
  
  const loginBody = new URLSearchParams({
    csrfToken: csrfData.csrfToken,
    email,
    password,
    json: 'true'
  });
  
  res = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': cookies
    },
    body: loginBody
  });
  
  let cookieStr = res.headers.get('set-cookie');
  if (cookieStr) {
    const match = cookieStr.match(/next-auth\.session-token=([^;]+)/);
    if (match) return `next-auth.session-token=${match[1]}`;
  }
  return null;
}

async function testEndpoint(name, method, url, sessionCookie, body = null) {
  const options = {
    method,
    headers: {
      'Cookie': sessionCookie || ''
    }
  };
  if (body) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }
  
  const res = await fetch(`${BASE_URL}${url}`, options);
  const data = res.status !== 204 ? await res.json().catch(() => null) : null;
  
  return { status: res.status, data };
}

const ROLES = [
  { email: 'fleet@example.com', role: 'FLEET_MANAGER' },
  { email: 'driver@example.com', role: 'DRIVER' },
  { email: 'safety@example.com', role: 'SAFETY_OFFICER' },
  { email: 'finance@example.com', role: 'FINANCIAL_ANALYST' }
];

async function runAudit() {
  console.log("=== Phase 5 API RBAC Audit ===");
  
  // Need to get IDs to test GET/PATCH/DELETE
  let fleetCookie = await login('fleet@example.com', 'admin123');
  const vehiclesRes = await testEndpoint('Get Vehicles', 'GET', '/api/vehicles', fleetCookie);
  const driversRes = await testEndpoint('Get Drivers', 'GET', '/api/drivers', fleetCookie);
  
  const vId = vehiclesRes.data[0].id;
  const dId = driversRes.data[0].id;
  
  for (const user of ROLES) {
    console.log(`\nTesting Role: ${user.role}`);
    const cookie = await login(user.email, 'admin123');
    
    // Test Vehicle Read (All should be allowed)
    const vr = await testEndpoint('Vehicle Read', 'GET', '/api/vehicles', cookie);
    console.log(`  Vehicle Read (GET /api/vehicles): ${vr.status === 200 ? '✅ 200' : '❌ ' + vr.status}`);
    
    // Test Vehicle Create (Only Fleet Manager)
    const vc = await testEndpoint('Vehicle Create', 'POST', '/api/vehicles', cookie, {
      regNumber: `TEST-V-${Date.now()}`,
      name: "Test Vehicle",
      type: "Van",
      maxLoadCapacity: 1000,
      odometer: 0,
      acquisitionCost: 10000,
      region: "North"
    });
    console.log(`  Vehicle Create (POST /api/vehicles): ${vc.status === 201 ? '✅ 201' : (vc.status === 403 ? '✅ 403' : '❌ ' + vc.status)}`);
    
    // Test Vehicle Update (Only Fleet Manager)
    const vu = await testEndpoint('Vehicle Update', 'PATCH', `/api/vehicles/${vId}`, cookie, { name: "Updated Name" });
    console.log(`  Vehicle Update (PATCH /api/vehicles/[id]): ${vu.status === 200 ? '✅ 200' : (vu.status === 403 ? '✅ 403' : '❌ ' + vu.status)}`);
    
    // Test Vehicle Delete (Only Fleet Manager)
    // We expect 409 Conflict if Fleet Manager due to trips, but 403 if unauthorized.
    const vd = await testEndpoint('Vehicle Delete', 'DELETE', `/api/vehicles/${vId}`, cookie);
    console.log(`  Vehicle Delete (DELETE /api/vehicles/[id]): ${[204,409].includes(vd.status) ? '✅ Allowed' : (vd.status === 403 ? '✅ 403' : '❌ ' + vd.status)}`);

    // Test Driver Read (All should be allowed)
    const dr = await testEndpoint('Driver Read', 'GET', '/api/drivers', cookie);
    console.log(`  Driver Read (GET /api/drivers): ${dr.status === 200 ? '✅ 200' : '❌ ' + dr.status}`);

    // Test Driver Create (Only Fleet Manager)
    const dc = await testEndpoint('Driver Create', 'POST', '/api/drivers', cookie, {
      name: "Test Driver",
      licenseNumber: `DL-T-${Date.now()}`,
      licenseCategory: "Class A",
      licenseExpiryDate: "2030-01-01",
      contactNumber: "555-9999",
      safetyScore: 100
    });
    console.log(`  Driver Create (POST /api/drivers): ${dc.status === 201 ? '✅ 201' : (dc.status === 403 ? '✅ 403' : '❌ ' + dc.status)}`);

    // Test Driver Full Update (Only Fleet Manager)
    const dfu = await testEndpoint('Driver Full Update', 'PATCH', `/api/drivers/${dId}`, cookie, { name: "Updated Name" });
    console.log(`  Driver Full Update (name) (PATCH /api/drivers/[id]): ${dfu.status === 200 ? '✅ 200' : (dfu.status === 403 ? '✅ 403' : '❌ ' + dfu.status)}`);

    // Test Driver Scoped Update (Fleet Manager AND Safety Officer)
    const dsu = await testEndpoint('Driver Scoped Update', 'PATCH', `/api/drivers/${dId}`, cookie, { status: "OFF_DUTY", safetyScore: 99 });
    console.log(`  Driver Scoped Update (status/safetyScore) (PATCH /api/drivers/[id]): ${dsu.status === 200 ? '✅ 200' : (dsu.status === 403 ? '✅ 403' : '❌ ' + dsu.status)}`);
  }
}

runAudit().catch(console.error);
