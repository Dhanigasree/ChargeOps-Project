import { z } from "zod";

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid resource id");

export const createPaymentSchema = z.object({
  body: z.object({
    bookingId: objectIdSchema,
    amount: z.coerce.number().min(0),
    paymentMethod: z.enum(["card", "upi", "wallet", "netbanking"])
  }),
  params: z.object({}).default({}),
  query: z.object({}).default({})
});

export const createMockPaymentSchema = z.object({
  body: z.object({
    bookingId: objectIdSchema,
    amount: z.coerce.number().min(0)
  }),
  params: z.object({}).default({}),
  query: z.object({}).default({})
});

export const verifyStripeSessionSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({
    session_id: z.string().min(1, "Session id is required")
  })
});

export const paymentIdSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({
    id: objectIdSchema
  }),
  query: z.object({}).default({})
});

export const invoiceIdSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({
    invoiceId: z.string().min(1, "Invoice id is required")
  }),
  query: z.object({}).default({})
});

export const generateInvoiceSchema = z.object({
  body: z.object({
    paymentId: objectIdSchema
  }),
  params: z.object({}).default({}),
  query: z.object({}).default({})
});
