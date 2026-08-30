import nodemailer from 'nodemailer'
import { config } from '../config.js'
import { BRAND_NAME } from '../constants/brand.js'

let transporter: nodemailer.Transporter | null = null

function getTransporter() {
  if (!config.isEmailConfigured()) return null
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass,
      },
    })
  }
  return transporter
}

export async function sendPasswordResetEmail(email: string, resetUrl: string) {
  const transport = getTransporter()
  const subject = `${BRAND_NAME} — Şifre Sıfırlama`
  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <h2 style="color:#e8b84a">${BRAND_NAME}</h2>
      <p>Şifreni sıfırlamak için aşağıdaki bağlantıya tıkla:</p>
      <p><a href="${resetUrl}" style="color:#e8b84a">${resetUrl}</a></p>
      <p style="color:#888;font-size:13px">Bu bağlantı 1 saat geçerlidir. Sen istemediysen bu e-postayı yok say.</p>
    </div>
  `

  if (!transport) {
    console.log('[email-dev] Şifre sıfırlama bağlantısı:', resetUrl)
    return { devMode: true, resetUrl }
  }

  await transport.sendMail({
    from: config.smtp.from,
    to: email,
    subject,
    html,
  })

  return { devMode: false }
}

export async function sendEmailVerificationEmail(email: string, verifyUrl: string) {
  const transport = getTransporter()
  const subject = `${BRAND_NAME} — E-posta Adresini Doğrula`
  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <h2 style="color:#e8b84a">${BRAND_NAME}'ya hoş geldin</h2>
      <p>Üyeliğini tamamlamak için e-posta adresini doğrula:</p>
      <p><a href="${verifyUrl}" style="display:inline-block;background:#e8b84a;color:#0d0f14;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">E-postamı Doğrula</a></p>
      <p style="word-break:break-all"><a href="${verifyUrl}" style="color:#e8b84a">${verifyUrl}</a></p>
      <p style="color:#888;font-size:13px">Bu bağlantı 24 saat geçerlidir. Sen kaydolmadıysan bu e-postayı yok say.</p>
    </div>
  `

  if (!transport) {
    console.log('[email-dev] E-posta doğrulama bağlantısı:', verifyUrl)
    return { devMode: true, verifyUrl }
  }

  await transport.sendMail({
    from: config.smtp.from,
    to: email,
    subject,
    html,
  })

  return { devMode: false }
}

const CONTACT_SUBJECT_LABELS: Record<string, string> = {
  oneri: 'Öneri',
  istek: 'İstek',
  sikayet: 'Şikayet',
  diger: 'Diğer',
}

export async function sendContactEmail(payload: {
  name: string
  email: string
  subject: string
  message: string
}) {
  const transport = getTransporter()
  const subjectLabel = CONTACT_SUBJECT_LABELS[payload.subject] ?? payload.subject
  const to = process.env.CONTACT_EMAIL ?? config.smtp.user ?? config.contactEmails.support
  const subject = `${BRAND_NAME} İletişim — ${subjectLabel}`
  const html = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
      <h2 style="color:#e8b84a">${BRAND_NAME} İletişim Formu</h2>
      <p><strong>Konu:</strong> ${subjectLabel}</p>
      <p><strong>Ad:</strong> ${payload.name}</p>
      <p><strong>E-posta:</strong> ${payload.email}</p>
      <hr style="border:none;border-top:1px solid #333;margin:16px 0" />
      <p style="white-space:pre-wrap">${payload.message}</p>
    </div>
  `

  if (!transport) {
    console.log('[email-dev] İletişim formu:', { ...payload, subjectLabel, to })
    return { devMode: true }
  }

  await transport.sendMail({
    from: config.smtp.from,
    to,
    replyTo: payload.email,
    subject,
    html,
  })

  return { devMode: false }
}
