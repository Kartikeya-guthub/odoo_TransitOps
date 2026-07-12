import { z } from "zod";

export const tripSchema = z.object({
  source: z.string().min(2, "Source location is required"),
  destination: z.string().min(2, "Destination location is required"),
  vehicleId: z.string().uuid("Invalid vehicle selection"),
  driverId: z.string().uuid("Invalid driver selection"),
  cargoWeight: z.number().positive("Cargo weight must be positive"),
  plannedDistance: z.number().positive("Planned distance must be positive"),
});

export type TripFormValues = z.infer<typeof tripSchema>;
