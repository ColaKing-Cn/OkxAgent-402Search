import { buildPaymentRequirements, decodePaymentHeader, encodePaymentRequired, encodePaymentResponse } from "@/lib/x402"
import { settlePayment, verifyPayment } from "@/lib/okx-payments"

export function createPaymentHeaders(resource: string) {
  const requirement = buildPaymentRequirements(resource)
  return {
    requirement,
    headers: {
      "Cache-Control": "no-store",
      "payment-required": encodePaymentRequired([requirement]),
      "x402-version": "1",
      "access-control-expose-headers": "payment-required,x402-version,x-payment-response",
    },
  }
}

export async function verifyAndSettlePayment(paymentHeader: string, requirement: ReturnType<typeof buildPaymentRequirements>) {
  const paymentPayload = decodePaymentHeader(paymentHeader)
  const verified = await verifyPayment(paymentPayload, requirement)
  const settled = verified.isValid ? await settlePayment(paymentPayload, requirement) : null
  return { paymentPayload, verified, settled }
}

export function createPaidResponseHeaders(settlement: unknown) {
  return {
    "Cache-Control": "no-store",
    "x-payment-response": encodePaymentResponse(settlement),
    "access-control-expose-headers": "x-payment-response",
  }
}
