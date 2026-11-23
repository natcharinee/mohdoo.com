// ===== ค่าตั้งระบบหลังบ้าน (อ่านจาก Environment Variables) =====
// ไม่ได้ตั้งค่า = ทำงานแบบทดลอง (ข้อมูลเก็บในไฟล์ · OTP/ชำระเงินแบบทดลองเมื่อเปิด OTP_DEMO / PAY_DEMO)
const env = process.env;
const flag = (v) => ['1', 'true', 'yes', 'on'].includes(String(v || '').toLowerCase());

const prod = env.VERCEL_ENV === 'production' || env.NODE_ENV === 'production';
// โหมดทดลอง (OTP 123456 · กดจ่ายแล้วไม่เสียเงิน) ใช้ได้เฉพาะเครื่อง dev และ Preview · บนเว็บจริงไม่มีผลแม้เผลอตั้งไว้
const demo = (v) => !prod && flag(v);
if (prod && (flag(env.OTP_DEMO) || flag(env.PAY_DEMO))) console.warn('[config] OTP_DEMO / PAY_DEMO ถูกปิดบน production');

export const config = {
  prod,
  onVercel: !!env.VERCEL,
  db: env.DATABASE_URL || env.POSTGRES_URL ? 'postgres' : 'file',
  databaseUrl: env.DATABASE_URL || env.POSTGRES_URL || '',
  sessionSecret: env.SESSION_SECRET || '',
  adminPhones: String(env.ADMIN_PHONES || '').split(',').map((p) => p.trim()).filter(Boolean),
  otp: env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_VERIFY_SID ? 'twilio' : demo(env.OTP_DEMO) ? 'demo' : 'off',
  twilio: { sid: env.TWILIO_ACCOUNT_SID, token: env.TWILIO_AUTH_TOKEN, verify: env.TWILIO_VERIFY_SID },
  pay: env.OMISE_SECRET_KEY ? 'omise' : demo(env.PAY_DEMO) ? 'demo' : 'off',
  omiseSecret: env.OMISE_SECRET_KEY || '',
  storage: env.BLOB_READ_WRITE_TOKEN ? 'blob' : 'file',
  vapid: env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY ? { pub: env.VAPID_PUBLIC_KEY, priv: env.VAPID_PRIVATE_KEY, subject: env.VAPID_SUBJECT || 'mailto:admin@example.com' } : null,
  cronSecret: env.CRON_SECRET || '',
  ai: !!env.ANTHROPIC_API_KEY, // แม่หมอ AI พร้อมใช้ (MOHDOO_AI_CODE เป็นแค่รหัสทดสอบของทีม ไม่ต้องมี)
  dataDir: env.MOHDOO_DATA_DIR || (env.VERCEL ? '/tmp/mohdoo-data' : '.data'),
  orderMinutes: 15, // QR หมดอายุ
};
