import crypto from 'node:crypto'
import { v4 as uuid } from 'uuid'
import { config } from '../config.js'

function generateAuthHeader(uri: string, body: string) {
  const randomKey = uuid().replace(/-/g, '').slice(0, 16)
  const payload = randomKey + uri + body
  const signature = crypto
    .createHmac('sha256', config.iyzico.secretKey)
    .update(payload)
    .digest('hex')
  const authorization = `IYZWSv2 ${Buffer.from(`apiKey:${config.iyzico.apiKey}&randomKey:${randomKey}&signature:${signature}`).toString('base64')}`
  return { authorization, randomKey }
}

export async function createIyzicoCheckout(params: {
  userId: string
  planName: string
  price: string
  buyerName: string
  buyerSurname: string
  email: string
  merchantOid: string
}) {
  const uri = '/payment/iyzipos/checkoutform/initialize/auth/ecom'
  const request = {
    locale: 'tr',
    conversationId: params.merchantOid,
    price: params.price,
    paidPrice: params.price,
    currency: 'TRY',
    basketId: params.merchantOid,
    paymentGroup: 'PRODUCT',
    callbackUrl: `${config.publicUrl}/api/billing/callback/iyzico`,
    enabledInstallments: [1],
    buyer: {
      id: params.userId,
      name: params.buyerName,
      surname: params.buyerSurname,
      gsmNumber: '+905555555555',
      email: params.email,
      identityNumber: '11111111111',
      registrationAddress: 'Istanbul Turkiye',
      ip: '85.34.78.112',
      city: 'Istanbul',
      country: 'Turkey',
    },
    shippingAddress: {
      contactName: `${params.buyerName} ${params.buyerSurname}`,
      city: 'Istanbul',
      country: 'Turkey',
      address: 'Istanbul Turkiye',
    },
    billingAddress: {
      contactName: `${params.buyerName} ${params.buyerSurname}`,
      city: 'Istanbul',
      country: 'Turkey',
      address: 'Istanbul Turkiye',
    },
    basketItems: [
      {
        id: params.merchantOid,
        name: params.planName,
        category1: 'Abonelik',
        itemType: 'VIRTUAL',
        price: params.price,
      },
    ],
  }

  const body = JSON.stringify(request)
  const { authorization } = generateAuthHeader(uri, body)

  const response = await fetch(`${config.iyzico.baseUrl}${uri}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authorization,
    },
    body,
  })

  return response.json() as Promise<{
    status: string
    paymentPageUrl?: string
    checkoutFormContent?: string
    token?: string
    errorMessage?: string
  }>
}

export async function retrieveIyzicoCheckout(token: string) {
  const uri = '/payment/iyzipos/checkoutform/auth/ecom/detail'
  const request = { locale: 'tr', conversationId: uuid(), token }
  const body = JSON.stringify(request)
  const { authorization } = generateAuthHeader(uri, body)

  const response = await fetch(`${config.iyzico.baseUrl}${uri}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authorization,
    },
    body,
  })

  return response.json() as Promise<{
    status: string
    paymentStatus?: string
    basketId?: string
  }>
}
