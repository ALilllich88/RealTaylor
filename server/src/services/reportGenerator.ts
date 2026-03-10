import puppeteer from 'puppeteer';
import { entityColor, DEFAULT_IRS_MILEAGE_RATE } from '../constants.js';

const irsRate = parseFloat(process.env.IRS_MILEAGE_RATE || String(DEFAULT_IRS_MILEAGE_RATE));


const baseStyle = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 11px; color: #1a1a1a; padding: 24px; }
  h1 { font-size: 20px; font-weight: 700; margin-bottom: 4px; color: #111; }
  h2 { font-size: 14px; font-weight: 600; margin: 16px 0 8px; color: #333; }
  .subtitle { color: #666; font-size: 11px; margin-bottom: 20px; }
  .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
  .summary-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px; }
  .summary-card .label { font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; }
  .summary-card .value { font-size: 18px; font-weight: 700; color: #111; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th { background: #f3f4f6; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; padding: 6px 8px; text-align: left; border-bottom: 1px solid #e5e7eb; }
  td { padding: 6px 8px; border-bottom: 1px solid #f3f4f6; vertical-align: top; }
  tr:nth-child(even) td { background: #fafafa; }
  .badge { display: inline-block; padding: 1px 6px; border-radius: 9999px; font-size: 9px; font-weight: 600; color: white; }
  .auto-badge { background: #6b7280; font-size: 9px; padding: 1px 5px; border-radius: 9999px; color: white; margin-left: 4px; }
  .footer { margin-top: 24px; font-size: 9px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 8px; }
  @media print { body { padding: 16px; } }
`;

export async function generateHoursPdf(entries: any[], summary: any, dateRange: string): Promise<Buffer> {
  const totalHours = entries.reduce((s, e) => s + e.hours, 0);
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${baseStyle}</style></head><body>
    <h1>REPS Hours Log</h1>
    <div class="subtitle">Taylor Lillich &bull; ${dateRange} &bull; Generated ${new Date().toLocaleDateString()}</div>
    <div class="summary-grid">
      <div class="summary-card"><div class="label">Total Hours</div><div class="value">${totalHours.toFixed(1)}</div></div>
      <div class="summary-card"><div class="label">Entries</div><div class="value">${entries.length}</div></div>
      <div class="summary-card"><div class="label">750-hr Threshold</div><div class="value">${totalHours >= 750 ? '✓ Met' : (750 - totalHours).toFixed(1) + ' to go'}</div></div>
    </div>
    <h2>Hours by Entity</h2>
    <table>
      <tr>${Object.keys(summary.byEntity).map((k) => `<th>${k}</th>`).join('')}</tr>
      <tr>${Object.values(summary.byEntity).map((v: any) => `<td>${v.toFixed(1)} hrs</td>`).join('')}</tr>
    </table>
    <h2>Detailed Log</h2>
    <table>
      <tr><th>Date</th><th>Entity</th><th>Activity</th><th>Hours</th><th>Description</th></tr>
      ${entries.map((e) => `
        <tr>
          <td>${new Date(e.date).toLocaleDateString()}</td>
          <td><span class="badge" style="background:${entityColor(e.entity)}">${e.entity}</span></td>
          <td>${e.activityType}</td>
          <td>${e.hours.toFixed(2)}</td>
          <td>${e.description}${e.isAutoLogged ? '<span class="auto-badge">auto</span>' : ''}${e.notes ? `<br><em style="color:#888">${e.notes}</em>` : ''}</td>
        </tr>`).join('')}
    </table>
    <div class="footer">RealTaylor &bull; IRS Real Estate Professional Status Documentation &bull; Keep this log for tax records.</div>
  </body></html>`;
  return renderPdf(html);
}

export async function generateMileagePdf(entries: any[], summary: any, dateRange: string): Promise<Buffer> {
  const totalBusiness = entries.filter((e) => e.entity !== 'Personal').reduce((s, e) => s + e.actualMiles, 0);
  const totalPersonal = entries.filter((e) => e.entity === 'Personal').reduce((s, e) => s + e.actualMiles, 0);
  const deduction = totalBusiness * irsRate;
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${baseStyle}</style></head><body>
    <h1>Mileage Log</h1>
    <div class="subtitle">Taylor Lillich &bull; 2026 Yukon Denali &bull; ${dateRange} &bull; Generated ${new Date().toLocaleDateString()}</div>
    <div class="summary-grid">
      <div class="summary-card"><div class="label">Business Miles</div><div class="value">${totalBusiness.toFixed(1)}</div></div>
      <div class="summary-card"><div class="label">Personal Miles</div><div class="value">${totalPersonal.toFixed(1)}</div></div>
      <div class="summary-card"><div class="label">Est. Deduction @ $${irsRate}/mi</div><div class="value">$${deduction.toFixed(2)}</div></div>
    </div>
    <h2>Detailed Log</h2>
    <table>
      <tr><th>Date</th><th>From</th><th>To</th><th>Miles</th><th>RT</th><th>Entity</th><th>Purpose</th></tr>
      ${entries.map((e) => {
        const from = e.fromPlace?.name ?? e.fromAddress ?? '—';
        const to = e.toPlace?.name ?? e.toAddress ?? '—';
        return `<tr>
          <td>${new Date(e.date).toLocaleDateString()}</td>
          <td>${from}</td><td>${to}</td>
          <td>${e.actualMiles.toFixed(1)}</td>
          <td>${e.isRoundTrip ? '✓' : ''}</td>
          <td><span class="badge" style="background:${entityColor(e.entity)}">${e.entity}</span></td>
          <td>${e.description}${e.notes ? `<br><em style="color:#888">${e.notes}</em>` : ''}</td>
        </tr>`;
      }).join('')}
    </table>
    <div class="footer">RealTaylor &bull; IRS Standard Mileage Rate: $${irsRate}/mile &bull; Keep this log with odometer readings for tax records.</div>
  </body></html>`;
  return renderPdf(html);
}

export async function generateAnnualSummaryPdf(data: any, year: number): Promise<Buffer> {
  const deduction = data.businessMiles * irsRate;
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${baseStyle}</style></head><body>
    <h1>Annual Tax Summary — ${year}</h1>
    <div class="subtitle">Taylor Lillich &bull; Prepared for CPA &bull; Generated ${new Date().toLocaleDateString()}</div>
    <h2>REPS Qualification</h2>
    <div class="summary-grid">
      <div class="summary-card"><div class="label">Total Hours</div><div class="value">${data.totalHours.toFixed(1)}</div></div>
      <div class="summary-card"><div class="label">750-hr Threshold</div><div class="value" style="color:${data.totalHours >= 750 ? '#16a34a' : '#dc2626'}">${data.totalHours >= 750 ? '✓ MET' : '✗ NOT MET'}</div></div>
      <div class="summary-card"><div class="label">Remaining</div><div class="value">${Math.max(0, 750 - data.totalHours).toFixed(1)} hrs</div></div>
    </div>
    <h2>Hours by Entity</h2>
    <table>
      <tr><th>Entity</th><th>Hours</th><th>% of Total</th></tr>
      ${data.hoursByEntity.map((r: any) => `<tr><td><span class="badge" style="background:${entityColor(r.entity)}">${r.entity}</span></td><td>${r.hours.toFixed(1)}</td><td>${data.totalHours > 0 ? ((r.hours / data.totalHours) * 100).toFixed(1) : 0}%</td></tr>`).join('')}
    </table>
    <h2>Mileage Summary</h2>
    <div class="summary-grid">
      <div class="summary-card"><div class="label">Business Miles</div><div class="value">${data.businessMiles.toFixed(1)}</div></div>
      <div class="summary-card"><div class="label">Personal Miles</div><div class="value">${data.personalMiles.toFixed(1)}</div></div>
      <div class="summary-card"><div class="label">Est. Deduction</div><div class="value">$${deduction.toFixed(2)}</div></div>
    </div>
    <h2>Mileage by Entity</h2>
    <table>
      <tr><th>Entity</th><th>Miles</th></tr>
      ${data.mileageByEntity.map((r: any) => `<tr><td><span class="badge" style="background:${entityColor(r.entity)}">${r.entity}</span></td><td>${r.miles.toFixed(1)}</td></tr>`).join('')}
    </table>
    <div class="footer">RealTaylor &bull; IRS Standard Mileage Rate: $${irsRate}/mile &bull; This summary is for tax preparation purposes.</div>
  </body></html>`;
  return renderPdf(html);
}

async function renderPdf(html: string): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({ format: 'Letter', printBackground: true, margin: { top: '0.5in', bottom: '0.5in', left: '0.5in', right: '0.5in' } });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
