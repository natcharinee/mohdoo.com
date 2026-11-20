// ===== ชำระเงิน: Omise PromptPay (ตั้ง OMISE_SECRET_KEY) หรือโหมดทดลอง (PAY_DEMO=1) =====
// สร้าง charge แบบ source promptpay → ได้รูป QR ให้ลูกค้าสแกน → ยืนยันจาก webhook หรือการถามสถานะ (ดึงจาก Omise เสมอ)
import { config } from './config.js';
import { fail } from './http.js';

const auth = () => `Basic ${Buffer.from(`${config.omiseSecret}:`).toString('base64')}`;
async function omise(method, pathname, form) {
  const r = await fetch(`https://api.omise.co${pathname}`, {
    method,
    headers: { Authorization: auth(), ...(form ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}) },
    body: form ? new URLSearchParams(form) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.object === 'error') fail(502, 'payment_failed', { detail: j.message });
  return j;
}

export async function createPayment(order) {
  if (config.pay === 'off') fail(503, 'payment_not_configured');
  const expires = Date.now() + config.orderMinutes * 60e3;
  if (config.pay === 'demo') return { provider: 'demo', expires_at: expires };
  const ch = await omise('POST', '/charges', {
    amount: String(Math.round(order.amount * 100)), currency: 'thb',
    'source[type]': 'promptpay', 'metadata[order_no]': order.no,
    description: `${order.no} ${order.title}`.slice(0, 255),
  });
  return {
    provider: 'omise', charge_id: ch.id,
    qr: ch.source?.scannable_code?.image?.download_uri || null,
    expires_at: ch.expires_at ? Date.parse(ch.expires_at) : expires,
  };
}

// สถานะจริงจาก Omise: 'paid' | 'pending' | 'failed'
export async function paymentStatus(pay) {
  if (!pay || pay.provider !== 'omise' || !pay.charge_id) return 'pending';
  const ch = await omise('GET', `/charges/${encodeURIComponent(pay.charge_id)}`);
  if (ch.status === 'successful' && ch.paid) return 'paid';
  if (['failed', 'expired', 'reversed'].includes(ch.status)) return 'failed';
  return 'pending';
}
export const chargeIdFromEvent = (ev) => (ev && ev.data && ev.data.object === 'charge' ? ev.data.id : null);

// คืนเงิน (ผู้ดูแลเท่านั้น) · โหมดทดลองแค่บันทึก
export async function refundPayment(pay, amount) {
  if (!pay || pay.provider !== 'omise') return { provider: pay?.provider || 'none', recorded: true };
  const rf = await omise('POST', `/charges/${encodeURIComponent(pay.charge_id)}/refunds`, { amount: String(Math.round(amount * 100)) });
  return { provider: 'omise', refund_id: rf.id };
}
