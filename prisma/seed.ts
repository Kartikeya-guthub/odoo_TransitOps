import { PrismaClient, Role, VehicleStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding data...')
  
  // Wipe in FK-safe order (vehicles first, then users)
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

  // --- 2. Create Vehicles ---
  const vehicles = [
    { regNumber: "TRK-001", name: "Volvo FH16",        type: "Heavy Truck", maxLoadCapacity: 40000, odometer: 125000, acquisitionCost: 150000, region: "North", status: VehicleStatus.AVAILABLE },
    { regNumber: "VAN-002", name: "Ford Transit",       type: "Cargo Van",   maxLoadCapacity: 3500,  odometer: 45000,  acquisitionCost: 45000,  region: "South", status: VehicleStatus.AVAILABLE },
    { regNumber: "TRK-003", name: "Scania R500",        type: "Heavy Truck", maxLoadCapacity: 38000, odometer: 210000, acquisitionCost: 130000, region: "East",  status: VehicleStatus.ON_TRIP  },
    { regNumber: "TRK-004", name: "Mercedes Actros",    type: "Heavy Truck", maxLoadCapacity: 42000, odometer: 320000, acquisitionCost: 140000, region: "West",  status: VehicleStatus.IN_SHOP  },
    { regNumber: "VAN-005", name: "Mercedes Sprinter",  type: "Cargo Van",   maxLoadCapacity: 3000,  odometer: 450000, acquisitionCost: 40000,  region: "North", status: VehicleStatus.RETIRED   },
  ]

  for (const v of vehicles) {
    await prisma.vehicle.create({ data: v })
    console.log(`Created vehicle: ${v.regNumber} [${v.status}]`)
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
