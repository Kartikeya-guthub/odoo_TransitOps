import { z } from "zod";

export const fuelLogSchema = z.object({
  vehicleId: z.string().uuid("Invalid vehicle selection"),
  liters: z.number().positive("Liters must be a positive number"),
  cost: z.number().min(0, "Cost must be a positive number"),
  date: z.string().or(z.date()).transform((val) => new Date(val)).refine((date) => date <= new Date(), {
    message: "Date cannot be in the future",
  }),
});

export type FuelLogFormValues = z.infer<typeof fuelLogSchema>;
