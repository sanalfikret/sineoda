import { config, DEV_JWT_SECRET } from '../config.js'

/** Production'da zayıf JWT ile sunucuyu başlatma — tek zorunlu kontrol. */
export function assertProductionSecurity() {
  if (!config.isProduction) return

  const failures: string[] = []

  if (!config.jwtSecret || config.jwtSecret === DEV_JWT_SECRET) {
    failures.push('JWT_SECRET — güçlü, benzersiz bir değer tanımlayın (.env).')
  } else if (config.jwtSecret.length < 32) {
    failures.push('JWT_SECRET — en az 32 karakter olmalı.')
  }

  if (failures.length > 0) {
    console.error('\n[security] Production JWT kontrolü başarısız:\n')
    for (const item of failures) {
      console.error(`  • ${item}`)
    }
    console.error('\nSunucu başlatılmadı.\n')
    process.exit(1)
  }
}

/** Yayın öncesi checklist — uyarı verir, sunucuyu durdurmaz (test VPS için). */
export function warnProductionReadiness() {
  if (!config.isProduction) return

  const warnings: string[] = []

  if (!config.isEmailConfigured()) {
    warnings.push('SMTP yapılandırılmamış — e-posta doğrulama / şifre sıfırlama dev modunda.')
  }

  if (config.requireSmsVerification && !config.isSmsConfigured()) {
    warnings.push('SMS yapılandırılmamış — kayıt OTP API yanıtında sızabilir (production devMode kapalı).')
  }

  if (config.paytr.testMode) {
    warnings.push('PAYTR_TEST_MODE=1 — canlı ödeme için test modunu kapatın.')
  }

  if (warnings.length === 0) return

  console.warn('\n[security] Production hazırlık uyarıları:')
  for (const item of warnings) {
    console.warn(`  ⚠ ${item}`)
  }
  console.warn('')
}
