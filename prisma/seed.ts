import { PrismaClient, Role, VehicleStatus, DriverStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding data...')
  
  // Wipe in FK-safe order
  await prisma.fuelLog.deleteMany()
  await prisma.expense.deleteMany()
  await prisma.maintenanceLog.deleteMany()
  await prisma.trip.deleteMany()
  await prisma.vehicleDocument.deleteMany()
  await prisma.driverProfile.deleteMany()
  await prisma.vehicle.deleteMany()
  await prisma.user.deleteMany()

  const passwordHash = await bcrypt.hash('admin123', 10)

  const users = [
    { email: 'fleet@example.com', role: Role.FLEET_MANAGER },
    { email: 'dispatcher@example.com', role: Role.DISPATCHER },
    { email: 'safety@example.com', role: Role.SAFETY_OFFICER },
    { email: 'finance@example.com', role: Role.FINANCIAL_ANALYST },
  ]

  for (const u of users) {
    await prisma.user.create({
      data: {
        email: u.email,
        passwordHash,
        role: u.role,
      }
    })
    console.log(`Created user: ${u.email} [${u.role}]`)
  }

  // --- 2. Create Drivers ---
  const drivers = [
    {
      name: "Alice Johnson",
      licenseNumber: "DL-1001",
      licenseCategory: "Class A",
      licenseExpiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 2)), // Future
      contactNumber: "555-0101",
      safetyScore: 95,
      status: "AVAILABLE",
    },
    {
      name: "Bob Smith",
      licenseNumber: "DL-1002",
      licenseCategory: "Class A",
      licenseExpiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)), // Future
      contactNumber: "555-0102",
      safetyScore: 82,
      status: "ON_TRIP",
    },
    {
      name: "Charlie Davis",
      licenseNumber: "DL-1003",
      licenseCategory: "Class B",
      licenseExpiryDate: new Date(new Date().setDate(new Date().getDate() + 15)), // Expiring in 15 days (hits the 30-day cron window)
      contactNumber: "555-0103",
      safetyScore: 78,
      status: "AVAILABLE", // Still available in DB, but derived logic makes ineligible
    },
    {
      name: "Diana Evans",
      licenseNumber: "DL-1004",
      licenseCategory: "Class A",
      licenseExpiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 3)), // Future
      contactNumber: "555-0104",
      safetyScore: 45,
      status: "SUSPENDED", // Ineligible due to status
    },
    {
      name: "Ethan Wright",
      licenseNumber: "DL-1005",
      licenseCategory: "Class C",
      licenseExpiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)), // Future
      contactNumber: "555-0105",
      safetyScore: 99,
      status: "OFF_DUTY",
    },
  ];

  for (const d of drivers) {
    await prisma.driverProfile.create({ data: { ...d, status: d.status as DriverStatus } })
    console.log(`Created driver: ${d.name} [${d.status}]`)
  }

  // --- 2.5 Bulk Generate Drivers ---
  const firstNames = ["James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda", "William", "Elizabeth", "David", "Barbara", "Richard", "Susan", "Joseph", "Jessica", "Thomas", "Sarah", "Charles", "Karen"];
  const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin"];
  
  for (let i = 6; i <= 50; i++) {
    const fn = firstNames[Math.floor(Math.random() * firstNames.length)];
    const ln = lastNames[Math.floor(Math.random() * lastNames.length)];
    const statuses = ["AVAILABLE", "ON_TRIP", "OFF_DUTY"];
    const status = statuses[Math.floor(Math.random() * statuses.length)] as DriverStatus;
    await prisma.driverProfile.create({
      data: {
        name: `${fn} ${ln}`,
        licenseNumber: `DL-20${i.toString().padStart(3, '0')}`,
        licenseCategory: Math.random() > 0.5 ? "Class A" : "Class B",
        licenseExpiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + Math.floor(Math.random() * 5) + 1)),
        contactNumber: `555-${Math.floor(1000 + Math.random() * 9000)}`,
        safetyScore: Math.floor(60 + Math.random() * 40),
        status,
      }
    });
  }
  console.log("Created 45 bulk drivers");


  // --- 3. Create Vehicles ---
  const vehicles = [
    { regNumber: "TRK-001", name: "Volvo FH16",        type: "Heavy Truck", maxLoadCapacity: 40000, odometer: 125000, acquisitionCost: 150000, region: "North", status: VehicleStatus.AVAILABLE },
    { regNumber: "VAN-002", name: "Ford Transit",       type: "Cargo Van",   maxLoadCapacity: 3500,  odometer: 45000,  acquisitionCost: 45000,  region: "South", status: VehicleStatus.AVAILABLE },
    { regNumber: "TRK-003", name: "Scania R500",        type: "Heavy Truck", maxLoadCapacity: 38000, odometer: 210000, acquisitionCost: 130000, region: "East",  status: VehicleStatus.ON_TRIP  },
    { regNumber: "TRK-004", name: "Mercedes Actros",    type: "Heavy Truck", maxLoadCapacity: 42000, odometer: 320000, acquisitionCost: 140000, region: "West",  status: VehicleStatus.IN_SHOP  },
    { regNumber: "VAN-005", name: "Mercedes Sprinter",  type: "Cargo Van",   maxLoadCapacity: 3000,  odometer: 450000, acquisitionCost: 40000,  region: "North", status: VehicleStatus.RETIRED   },
  ]

  for (const v of vehicles) {
    const created = await prisma.vehicle.create({ data: v })
    console.log(`Created vehicle: ${created.regNumber} [${created.status}]`)

    // Seed Active Maintenance Log for the IN_SHOP vehicle
    if (created.status === "IN_SHOP") {
      await prisma.maintenanceLog.create({
        data: {
          vehicleId: created.id,
          description: "Routine engine overhaul and brake pads replacement",
          cost: 1200,
          date: new Date(),
          status: "ACTIVE"
        }
      })
      console.log(`Created MaintenanceLog for ${created.regNumber}`)
    }
  }

  // --- 3.5 Bulk Generate Vehicles ---
  const vTypes = ["Heavy Truck", "Cargo Van", "Box Truck", "Refrigerated Truck"];
  const vBrands = ["Volvo FH16", "Ford Transit", "Scania R500", "Mercedes Actros", "Freightliner Cascadia", "Kenworth T680", "Peterbilt 579"];
  const regions = ["North", "South", "East", "West"];
  const vStatuses = ["AVAILABLE", "ON_TRIP", "IN_SHOP"];
  
  for (let i = 6; i <= 50; i++) {
    const type = vTypes[Math.floor(Math.random() * vTypes.length)];
    const brand = vBrands[Math.floor(Math.random() * vBrands.length)];
    const region = regions[Math.floor(Math.random() * regions.length)];
    const status = vStatuses[Math.floor(Math.random() * vStatuses.length)] as VehicleStatus;
    const prefix = type.includes("Van") ? "VAN" : "TRK";
    const createdV = await prisma.vehicle.create({
      data: {
        regNumber: `${prefix}-1${i.toString().padStart(3, '0')}`,
        name: brand,
        type,
        maxLoadCapacity: Math.floor(2000 + Math.random() * 38000),
        odometer: Math.floor(10000 + Math.random() * 490000),
        acquisitionCost: Math.floor(30000 + Math.random() * 120000),
        region,
        status,
      }
    });

    if (createdV.status === "IN_SHOP") {
      await prisma.maintenanceLog.create({
        data: {
          vehicleId: createdV.id,
          description: "Routine scheduled maintenance and inspections",
          cost: Math.floor(200 + Math.random() * 1500),
          date: new Date(),
          status: "ACTIVE"
        }
      });
    }
  }
  console.log("Created 45 bulk vehicles");

  // --- 4. Seed Standalone Fuel Logs & Expenses ---
  // Fetch vehicles to use their real IDs
  const dbVehicles = await prisma.vehicle.findMany()
  const dbDrivers = await prisma.driverProfile.findMany()
  const fm = await prisma.user.findFirst({ where: { role: "FLEET_MANAGER" } })
  
  if (dbVehicles.length >= 2 && dbDrivers.length >= 2 && fm) {
    const v1 = dbVehicles[0] // TRK-001
    const v2 = dbVehicles[1] // VAN-002
    const d1 = dbDrivers[0]
    const d2 = dbDrivers[1]

    await prisma.fuelLog.createMany({
      data: [
        { vehicleId: v1.id, liters: 150.5, cost: 220.75, date: new Date(new Date().setDate(new Date().getDate() - 2)) },
        { vehicleId: v1.id, liters: 120.0, cost: 180.00, date: new Date() },
        { vehicleId: v2.id, liters: 60.5,  cost: 95.50,  date: new Date(new Date().setDate(new Date().getDate() - 1)) },
      ]
    })
    console.log("Created Standalone Fuel Logs")

    await prisma.expense.createMany({
      data: [
        { vehicleId: v1.id, type: "TOLL", amount: 45.00, date: new Date(new Date().setDate(new Date().getDate() - 2)) },
        { vehicleId: v1.id, type: "MAINTENANCE", amount: 150.00, date: new Date() },
        { vehicleId: v2.id, type: "MISC", amount: 25.00, date: new Date(new Date().setDate(new Date().getDate() - 1)) },
      ]
    })
    console.log("Created Expenses")

    // --- 5. Seed Trips ---
    const trips = [
      {
        source: "Warehouse A",
        destination: "Distribution Center",
        vehicleId: v1.id,
        driverId: d1.id,
        cargoWeight: 15000,
        plannedDistance: 450,
        actualDistance: 460,
        revenue: 1200.00,
        status: "COMPLETED",
        createdById: fm.id,
        createdAt: new Date(new Date().setDate(new Date().getDate() - 5)),
        dispatchedAt: new Date(new Date().setDate(new Date().getDate() - 4)),
        completedAt: new Date(new Date().setDate(new Date().getDate() - 2))
      },
      {
        source: "Port B",
        destination: "Retail Hub",
        vehicleId: v2.id,
        driverId: d2.id,
        cargoWeight: 2000,
        plannedDistance: 120,
        actualDistance: 125,
        revenue: 400.00,
        status: "COMPLETED",
        createdById: fm.id,
        createdAt: new Date(new Date().setDate(new Date().getDate() - 10)),
        dispatchedAt: new Date(new Date().setDate(new Date().getDate() - 9)),
        completedAt: new Date(new Date().setDate(new Date().getDate() - 8))
      },
      {
        source: "Factory C",
        destination: "Warehouse B",
        vehicleId: dbVehicles[2].id, // TRK-003, which is ON_TRIP
        driverId: dbDrivers[1].id,   // Bob, who is ON_TRIP
        cargoWeight: 25000,
        plannedDistance: 600,
        status: "DISPATCHED",
        createdById: fm.id,
        createdAt: new Date(new Date().setDate(new Date().getDate() - 1)),
        dispatchedAt: new Date()
      }
    ]

    for (const t of trips) {
      await prisma.trip.create({ data: t as any })
    }
    console.log("Created Trips")

    // --- 6. Bulk Generate Random Trips & Logs ---
    const allVehicles = await prisma.vehicle.findMany();
    const allDrivers = await prisma.driverProfile.findMany();
    
    // Bulk fuel logs and expenses
    for (let i = 0; i < 100; i++) {
      const rv = allVehicles[Math.floor(Math.random() * allVehicles.length)];
      await prisma.fuelLog.create({
        data: {
          vehicleId: rv.id,
          liters: Math.floor(20 + Math.random() * 200),
          cost: Math.floor(50 + Math.random() * 300),
          date: new Date(new Date().setDate(new Date().getDate() - Math.floor(Math.random() * 30)))
        }
      });
      await prisma.expense.create({
        data: {
          vehicleId: rv.id,
          type: ["TOLL", "MAINTENANCE", "MISC"][Math.floor(Math.random() * 3)] as any,
          amount: Math.floor(15 + Math.random() * 400),
          date: new Date(new Date().setDate(new Date().getDate() - Math.floor(Math.random() * 30)))
        }
      });
    }
    console.log("Created 100 bulk fuel logs and expenses");

    // Bulk trips
    const sources = ["Warehouse A", "Port B", "Factory C", "Distribution Center", "Retail Hub", "Supplier Depot", "Dock 4"];
    for (let i = 0; i < 60; i++) {
      const rv = allVehicles[Math.floor(Math.random() * allVehicles.length)];
      const rd = allDrivers[Math.floor(Math.random() * allDrivers.length)];
      const src = sources[Math.floor(Math.random() * sources.length)];
      let dest = sources[Math.floor(Math.random() * sources.length)];
      while (dest === src) dest = sources[Math.floor(Math.random() * sources.length)];
      
      const tripStatuses = ["COMPLETED", "COMPLETED", "COMPLETED", "DISPATCHED", "DRAFT"];
      const tStatus = tripStatuses[Math.floor(Math.random() * tripStatuses.length)];
      
      await prisma.trip.create({
        data: {
          source: src,
          destination: dest,
          vehicleId: rv.id,
          driverId: rd.id,
          cargoWeight: Math.floor(1000 + Math.random() * rv.maxLoadCapacity),
          plannedDistance: Math.floor(50 + Math.random() * 800),
          actualDistance: tStatus === "COMPLETED" ? Math.floor(50 + Math.random() * 850) : null,
          revenue: tStatus === "COMPLETED" ? Math.floor(200 + Math.random() * 2000) : null,
          status: tStatus as any,
          createdById: fm.id,
          createdAt: new Date(new Date().setDate(new Date().getDate() - Math.floor(10 + Math.random() * 20))),
          dispatchedAt: tStatus !== "DRAFT" ? new Date(new Date().setDate(new Date().getDate() - Math.floor(2 + Math.random() * 8))) : null,
          completedAt: tStatus === "COMPLETED" ? new Date(new Date().setDate(new Date().getDate() - Math.floor(Math.random() * 2))) : null
        }
      });
    }
    console.log("Created 60 bulk trips");
  }

}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
