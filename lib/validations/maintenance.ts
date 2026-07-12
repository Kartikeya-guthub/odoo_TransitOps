import { z } from "zod";

export const maintenanceSchema = z.object({
  vehicleId: z.string().uuid("Invalid vehicle selection"),
  description: z.string().min(3, "Description is required"),
  cost: z.number().min(0, "Cost must be a positive number"),
  date: z.string().or(z.date()).transform((val) => new Date(val)),
});

export type MaintenanceFormValues = z.infer<typeof maintenanceSchema>;
