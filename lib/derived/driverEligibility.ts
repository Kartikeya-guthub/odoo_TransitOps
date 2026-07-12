import { DriverProfile } from "@prisma/client";

export function isDriverEligible(driver: DriverProfile): boolean {
  if (driver.status !== "AVAILABLE") {
    return false;
  }
  
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize to start of day
  
  const expiryDate = new Date(driver.licenseExpiryDate);
  expiryDate.setHours(0, 0, 0, 0);
  
  return expiryDate >= today;
}
