// ===== ค่าตั้งระบบหลังบ้าน (อ่านจาก Environment Variables) =====
// ไม่ได้ตั้งค่า = ทำงานแบบทดลอง (ข้อมูลเก็บในไฟล์ · OTP/ชำระเงินแบบทดลองเมื่อเปิด OTP_DEMO / PAY_DEMO)
const env = process.env;
const flag = (v) => ['1', 'true', 'yes', 'on'].includes(String(v || '').toLowerCase());

export const config = {
  prod: env.VERCEL_ENV === 'production' || env.NODE_ENV === 'production',
  onVercel: !!env.VERCEL,
  db: env.DATABASE_URL || env.POSTGRES_URL ? 'postgres' : 'file',
  databaseUrl: env.DATABASE_URL || env.POSTGRES_URL || '',
  sessionSecret: env.SESSION_SECRET || '',
  adminPhones: String(env.ADMIN_PHONES || '').split(',').map((p) => p.trim()).filter(Boolean),
  otp: env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_VERIFY_SID ? 'twilio' : flag(env.OTP_DEMO) ? 'demo' : 'off',
  twilio: { sid: env.TWILIO_ACCOUNT_SID, token: env.TWILIO_AUTH_TOKEN, verify: env.TWILIO_VERIFY_SID },
  pay: env.OMISE_SECRET_KEY ? 'omise' : flag(env.PAY_DEMO) ? 'demo' : 'off',
  omiseSecret: env.OMISE_SECRET_KEY || '',
  storage: env.BLOB_READ_WRITE_TOKEN ? 'blob' : 'file',
  vapid: env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY ? { pub: env.VAPID_PUBLIC_KEY, priv: env.VAPID_PRIVATE_KEY, subject: env.VAPID_SUBJECT || 'mailto:admin@example.com' } : null,
  cronSecret: env.CRON_SECRET || '',
  ai: !!(env.ANTHROPIC_API_KEY && env.MOHDOO_AI_CODE),
  dataDir: env.MOHDOO_DATA_DIR || (env.VERCEL ? '/tmp/mohdoo-data' : '.data'),
  orderMinutes: 15, // QR หมดอายุ
};
