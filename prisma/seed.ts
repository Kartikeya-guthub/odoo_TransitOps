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
  await prisma.driverProfile.deleteMany()
  await prisma.vehicle.deleteMany()
  await prisma.user.deleteMany()

  const passwordHash = await bcrypt.hash('admin123', 10)

  const users = [
    { email: 'fleet@example.com', role: Role.FLEET_MANAGER },
    { email: 'driver@example.com', role: Role.DRIVER },
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
      licenseExpiryDate: new Date(new Date().setDate(new Date().getDate() - 5)), // Expired 5 days ago
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

  // --- 4. Seed Standalone Fuel Logs & Expenses ---
  // Fetch vehicles to use their real IDs
  const dbVehicles = await prisma.vehicle.findMany()
  if (dbVehicles.length > 0) {
    const v1 = dbVehicles[0] // TRK-001
    const v2 = dbVehicles[1] // VAN-002

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
