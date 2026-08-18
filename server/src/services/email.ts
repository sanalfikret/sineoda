import nodemailer from 'nodemailer'
import { config } from '../config.js'

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
  const subject = 'Sineoda — Şifre Sıfırlama'
  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <h2 style="color:#e8b84a">Sineoda</h2>
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
