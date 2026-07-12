import { z } from "zod";
import { ExpenseType } from "@prisma/client";

export const expenseSchema = z.object({
  vehicleId: z.string().uuid("Invalid vehicle selection"),
  type: z.nativeEnum(ExpenseType, { errorMap: () => ({ message: "Invalid expense type" }) }),
  amount: z.number().positive("Amount must be a positive number"),
  date: z.string().or(z.date()).transform((val) => new Date(val)).refine((date) => date <= new Date(), {
    message: "Date cannot be in the future",
  }),
});

export type ExpenseFormValues = z.infer<typeof expenseSchema>;
