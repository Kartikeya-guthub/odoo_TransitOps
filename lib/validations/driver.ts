import { z } from "zod";

export const driverSchema = z.object({
  name: z.string().min(1, "Name is required"),
  licenseNumber: z.string().min(1, "License number is required"),
  licenseCategory: z.string().min(1, "License category is required"),
  licenseExpiryDate: z.coerce.date(),
  contactNumber: z.string().min(5, "Contact number is required"),
  safetyScore: z.number().min(0).max(100, "Score must be between 0 and 100"),
});

export type DriverFormValues = z.infer<typeof driverSchema>;

export const driverStatusSchema = z.object({
  status: z.string(),
  safetyScore: z.number().min(0).max(100, "Score must be between 0 and 100"),
});

export type DriverStatusFormValues = z.infer<typeof driverStatusSchema>;
