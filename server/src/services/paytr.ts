import crypto from 'node:crypto'
import { config } from '../config.js'

export type PaytrBasketItem = [string, string, number]

export async function createPaytrToken(params: {
  email: string
  userName: string
  userPhone: string
  userAddress: string
  merchantOid: string
  amountKurus: number
  basket: PaytrBasketItem[]
  userIp: string
}) {
  const payment_amount = String(params.amountKurus)
  const user_basket = Buffer.from(JSON.stringify(params.basket)).toString('base64')
  const no_installment = '0'
  const max_installment = '0'
  const currency = 'TL'
  const test_mode = config.paytr.testMode ? '1' : '0'

  const hashStr =
    config.paytr.merchantId +
    params.userIp +
    params.merchantOid +
    params.email +
    payment_amount +
    user_basket +
    no_installment +
    max_installment +
    currency +
    test_mode

  const paytr_token = crypto
    .createHmac('sha256', config.paytr.merchantKey)
    .update(hashStr + config.paytr.merchantSalt)
    .digest('base64')

  const body = new URLSearchParams({
    merchant_id: config.paytr.merchantId,
    user_ip: params.userIp,
    merchant_oid: params.merchantOid,
    email: params.email,
    payment_amount,
    paytr_token,
    user_basket,
    debug_on: test_mode,
    no_installment,
    max_installment,
    user_name: params.userName,
    user_address: params.userAddress,
    user_phone: params.userPhone,
    merchant_ok_url: `${config.frontendUrl}/odeme/basarili`,
    merchant_fail_url: `${config.frontendUrl}/odeme/basarisiz`,
    timeout_limit: '30',
    currency,
    test_mode,
  })

  const response = await fetch('https://www.paytr.com/odeme/api/get-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })

  return response.json() as Promise<{ status: string; token?: string; reason?: string }>
}

export function verifyPaytrCallback(payload: {
  merchant_oid: string
  status: string
  total_amount: string
  hash: string
}) {
  const hashStr =
    payload.merchant_oid + config.paytr.merchantSalt + payload.status + payload.total_amount
  const expected = crypto
    .createHmac('sha256', config.paytr.merchantKey)
    .update(hashStr)
    .digest('base64')
  return expected === payload.hash
}
