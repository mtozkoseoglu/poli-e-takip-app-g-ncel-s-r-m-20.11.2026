import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Quote, Policy, PolicyEndorsement, CompanyOffer } from '../types/insurance';
import { formatCurrency, formatDateTr, getTodayIso } from './storage';
import { matchCompanyFromText } from './doganiumParser';

export const REPORT_COMPANIES = [
  { key: 'ALLIANZ SİGORTA', label: 'Allianz Sigorta' },
  { key: 'AXA SİGORTA', label: 'Axa Sigorta' },
  { key: 'DOĞA SİGORTA', label: 'Doğa Sigorta' },
  { key: 'HEPIYI SİGORTA', label: 'Hepiyi Sigorta' },
  { key: 'RAY SİGORTA', label: 'Ray Sigorta' },
  { key: 'HDI SİGORTA', label: 'HDI Sigorta' },
] as const;

/**
 * Finds the linked previous policy for a renewal quote
 */
export function findPreviousPolicy(
  quote: Quote,
  policies: Policy[] = []
): Policy | null {
  if (quote.originPolicyId) {
    const p = policies.find((pol) => pol.id === quote.originPolicyId);
    if (p) return p;
  }
  if (quote.previousPolicyNumber) {
    const p = policies.find((pol) => pol.policyNumber === quote.previousPolicyNumber);
    if (p) return p;
  }
  if (quote.plate) {
    const cleanQPlate = quote.plate.replace(/\s+/g, '').toUpperCase();
    const p = policies.find(
      (pol) =>
        pol.plate &&
        pol.plate.replace(/\s+/g, '').toUpperCase() === cleanQPlate &&
        pol.branch === quote.branch
    );
    if (p) return p;
  }
  return null;
}

/**
 * Extracts true original premium, original vehicle value, and notes of previous policy
 */
export function getPreviousPolicyOriginalData(
  policy: Policy | null,
  quote: Quote,
  endorsements: PolicyEndorsement[] = []
) {
  if (!policy) {
    return {
      company: quote.previousCompany || '—',
      originalPremium: typeof quote.previousPremium === 'number' && quote.previousPremium > 0 ? quote.previousPremium : null,
      originalVehicleValue: null,
      notes: quote.previousPolicyNotes || '',
      coverages: [] as string[],
      hasRecord: false,
    };
  }

  // 1. Original Premium: Prefer policy.originalPremium (never modified by endorsements)
  let origPrem: number | null = null;
  if (typeof policy.originalPremium === 'number' && policy.originalPremium > 0) {
    origPrem = policy.originalPremium;
  } else if (typeof policy.premium === 'number' && policy.premium > 0) {
    const policyEndorsements = endorsements.filter((e) => e.policyId === policy.id);
    if (policyEndorsements.length > 0) {
      const addPrem = policy.totalAdditionalPremium || 0;
      const refPrem = policy.totalRefundPremium || 0;
      const basePrem = (policy.currentPremium ?? policy.premium) - addPrem + refPrem;
      origPrem = basePrem > 0 ? basePrem : policy.premium;
    } else {
      origPrem = policy.premium;
    }
  }

  // 2. Original Vehicle Value: Prefer earliest endorsement oldValues.vehicleValue, or policy.vehicleValue
  let origValue: number | null = null;
  const policyEndorsements = endorsements.filter((e) => e.policyId === policy.id);
  const valueEndorsements = policyEndorsements
    .filter((e) => (e as any).oldValues && typeof (e as any).oldValues.vehicleValue === 'number')
    .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));

  if (valueEndorsements.length > 0 && typeof (valueEndorsements[0] as any).oldValues.vehicleValue === 'number') {
    origValue = (valueEndorsements[0] as any).oldValues.vehicleValue;
  } else if (typeof policy.vehicleValue === 'number' && policy.vehicleValue > 0) {
    origValue = policy.vehicleValue;
  }

  return {
    company: policy.company || quote.previousCompany || '—',
    originalPremium: origPrem,
    originalVehicleValue: origValue,
    notes: policy.notes || quote.previousPolicyNotes || '',
    coverages: policy.coverages || [],
    hasRecord: true,
  };
}

/**
 * Normalizes company offers for the 6 authorized companies
 */
export function getNormalizedOffers(quote: Quote) {
  const offersMap = new Map<string, {
    premium: number | null;
    quoteNumber: string;
    notes?: string;
    isReceived: boolean;
  }>();

  // 1. Read companyOffers if present
  if (Array.isArray(quote.companyOffers)) {
    quote.companyOffers.forEach((co) => {
      const matched = matchCompanyFromText(co.company);
      if (matched) {
        const hasPrem = !co.noOffer && co.status !== 'TEKLİF ALINAMADI' && typeof co.premium === 'number' && co.premium > 0;
        let qNo = co.quoteNumber ? co.quoteNumber.trim() : '';
        if (matched === 'RAY SİGORTA' && qNo) {
          qNo = qNo.replace(/\s*-\s*\d+$/, '').trim();
        }
        offersMap.set(matched, {
          premium: hasPrem ? Number(co.premium) : null,
          quoteNumber: qNo,
          notes: co.notes?.trim() || undefined,
          isReceived: hasPrem,
        });
      }
    });
  }

  // 2. Fallback to primary quote.company if not in map
  if (quote.company) {
    const matched = matchCompanyFromText(quote.company);
    if (matched && !offersMap.has(matched)) {
      const hasPrem = typeof quote.premium === 'number' && quote.premium > 0;
      let qNo = quote.quoteNumber ? quote.quoteNumber.trim() : '';
      if (matched === 'RAY SİGORTA' && qNo) {
        qNo = qNo.replace(/\s*-\s*\d+$/, '').trim();
      }
      offersMap.set(matched, {
        premium: hasPrem ? Number(quote.premium) : null,
        quoteNumber: qNo,
        notes: quote.notes?.trim() || undefined,
        isReceived: hasPrem,
      });
    }
  }

  // 3. Fallback to alternatives
  if (Array.isArray(quote.alternatives)) {
    quote.alternatives.forEach((alt) => {
      const matched = matchCompanyFromText(alt.company);
      if (matched && !offersMap.has(matched)) {
        const hasPrem = typeof alt.premium === 'number' && alt.premium > 0;
        offersMap.set(matched, {
          premium: hasPrem ? Number(alt.premium) : null,
          quoteNumber: '',
          notes: alt.notes?.trim() || undefined,
          isReceived: hasPrem,
        });
      }
    });
  }

  // Build list of exactly 6 companies
  const list = REPORT_COMPANIES.map((rc) => {
    const found = offersMap.get(rc.key);
    if (found && found.isReceived && found.premium !== null) {
      return {
        company: rc.label,
        key: rc.key,
        premium: found.premium,
        premiumStr: formatCurrency(found.premium),
        quoteNumber: found.quoteNumber || '—',
        notes: found.notes,
        isReceived: true,
      };
    }
    return {
      company: rc.label,
      key: rc.key,
      premium: null,
      premiumStr: 'Teklif Alınamadı',
      quoteNumber: '—',
      notes: undefined,
      isReceived: false,
    };
  });

  // Calculate lowest positive offer
  const receivedOnly = list.filter((item) => item.isReceived && item.premium !== null && item.premium > 0);
  let lowestOffer: typeof list[0] | null = null;
  if (receivedOnly.length > 0) {
    lowestOffer = receivedOnly.reduce((min, o) => ((o.premium as number) < (min.premium as number) ? o : min), receivedOnly[0]);
  }

  // Selected company match
  const selectedMatched = matchCompanyFromText(quote.company);

  return {
    offers: list,
    lowestOffer,
    selectedCompanyKey: selectedMatched,
  };
}

/**
 * Builds the HTML content for the Executive Summary Page (Page 1 of batch report)
 */
function buildExecutiveSummaryPageHtml(
  quotes: Quote[],
  options: {
    policies: Policy[];
    endorsements: PolicyEndorsement[];
    reportDateStr: string;
    agencyTitle?: string;
    reportTitle?: string;
  }
): string {
  const total = quotes.length;
  const kaskoCount = quotes.filter((q) => q.branch === 'Kasko').length;
  const trafikCount = quotes.filter((q) => q.branch === 'Trafik').length;
  const renewalCount = quotes.filter((q) => (q.businessType || 'Yenileme') === 'Yenileme').length;
  const newBusinessCount = quotes.filter((q) => q.businessType === 'Yeni İş').length;

  let totalBestPremium = 0;
  quotes.forEach((q) => {
    const { lowestOffer } = getNormalizedOffers(q);
    if (lowestOffer && lowestOffer.premium) {
      totalBestPremium += lowestOffer.premium;
    } else if (typeof q.premium === 'number' && q.premium > 0) {
      totalBestPremium += q.premium;
    }
  });

  const tableRowsHtml = quotes
    .map((q, idx) => {
      const { lowestOffer } = getNormalizedOffers(q);
      const bestText = lowestOffer ? `${lowestOffer.company} (${lowestOffer.premiumStr})` : '—';
      const bType = q.businessType || 'Yenileme';
      const bTypeClass = bType === 'Yeni İş' ? 'color: #047857; background: #ecfdf5;' : 'color: #1d4ed8; background: #eff6ff;';

      return `
        <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
          <td style="padding: 7px 8px; text-align: center; color: #64748b; font-weight: 600;">${idx + 1}</td>
          <td style="padding: 7px 8px; font-weight: 700; color: #0f172a; letter-spacing: 0.5px;">${q.plate || '—'}</td>
          <td style="padding: 7px 8px; font-weight: 600; color: #1e293b; max-width: 190px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${q.insured || '—'}</td>
          <td style="padding: 7px 8px; color: #334155;">${q.branch || 'Kasko'}</td>
          <td style="padding: 7px 8px;">
            <span style="display: inline-block; padding: 2px 7px; border-radius: 9999px; font-size: 9px; font-weight: 700; ${bTypeClass}">${bType}</span>
          </td>
          <td style="padding: 7px 8px; text-align: right; font-weight: 700; color: #0f172a;">${bestText}</td>
        </tr>
      `;
    })
    .join('');

  const displayAgency = options.agencyTitle?.trim() || 'SİGORTA ACENTESİ YÖNETİM PORTALI';
  const displayTitle = options.reportTitle?.trim() || 'AKTİF TEKLİFLER VE PORTFÖY DEĞERLENDİRME RAPORU';

  return `
    <div class="pdf-page" style="width: 794px; min-height: 1122px; padding: 40px 44px; box-sizing: border-box; background: #ffffff; color: #0f172a; position: relative;">
      <!-- Corporate Header -->
      <div style="border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end;">
        <div>
          <div style="font-size: 10px; font-weight: 800; letter-spacing: 1.5px; color: #2563eb; text-transform: uppercase;">${displayAgency}</div>
          <h1 style="margin: 4px 0 0 0; font-size: 20px; font-weight: 900; color: #0f172a; letter-spacing: -0.3px;">${displayTitle}</h1>
          <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Acente Yöneticisi Değerlendirme & Teklif Karşılaştırma Özeti</div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 10px; color: #64748b; font-weight: 600;">RAPOR TARİHİ</div>
          <div style="font-size: 12px; font-weight: 800; color: #0f172a;">${options.reportDateStr}</div>
        </div>
      </div>

      <!-- Overview Stats Grid -->
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 22px;">
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; text-align: center;">
          <div style="font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Toplam Araç</div>
          <div style="font-size: 20px; font-weight: 900; color: #0f172a; margin-top: 3px;">${total}</div>
        </div>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; text-align: center;">
          <div style="font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Kasko / Trafik</div>
          <div style="font-size: 16px; font-weight: 900; color: #0f172a; margin-top: 4px;">${kaskoCount} / ${trafikCount}</div>
        </div>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; text-align: center;">
          <div style="font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Yenileme / Yeni İş</div>
          <div style="font-size: 16px; font-weight: 900; color: #0f172a; margin-top: 4px;">${renewalCount} / ${newBusinessCount}</div>
        </div>
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 12px; text-align: center;">
          <div style="font-size: 9px; font-weight: 700; color: #166534; text-transform: uppercase; letter-spacing: 0.5px;">En Uygun Prim Hacmi</div>
          <div style="font-size: 15px; font-weight: 900; color: #15803d; margin-top: 4px;">${formatCurrency(totalBestPremium)}</div>
        </div>
      </div>

      <!-- Summary Vehicle List Table -->
      <div style="margin-bottom: 24px;">
        <div style="font-size: 11px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Rapora Dahil Edilen Aktif Teklifler</div>
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden;">
          <thead>
            <tr style="background: #0f172a; color: #ffffff; font-size: 10px; font-weight: 700; text-transform: uppercase;">
              <th style="padding: 8px; width: 36px; text-align: center;">#</th>
              <th style="padding: 8px; width: 90px; text-align: left;">Plaka</th>
              <th style="padding: 8px; text-align: left;">Sigortalı Adı / Ünvanı</th>
              <th style="padding: 8px; width: 75px; text-align: left;">Branş</th>
              <th style="padding: 8px; width: 75px; text-align: left;">İş Türü</th>
              <th style="padding: 8px; width: 200px; text-align: right;">En Uygun Teklif</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>
      </div>

      <div style="font-size: 10px; color: #64748b; line-height: 1.5; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 10px 14px;">
        <strong>Not:</strong> Bu rapor, acente portföyündeki aktif tekliflerin 6 yetkili sigorta şirketi (Allianz, Axa, Doğa, Hepiyi, Ray, HDI) fiyatlarını ve yenileme karşılaştırmalarını yöneticinin hızlıca değerlendirebilmesi amacıyla hazırlanmıştır. İlerleyen sayfalarda her aracın bağımsız detay raporu yer almaktadır.
      </div>

      <!-- Page Footer -->
      <div style="position: absolute; bottom: 30px; left: 44px; right: 44px; border-top: 1px solid #e2e8f0; padding-top: 10px; display: flex; justify-content: space-between; font-size: 9px; color: #94a3b8;">
        <span>Sigorta Acentesi Teklif Değerlendirme Raporu</span>
        <span>Yönetici Genel Özeti</span>
      </div>
    </div>
  `;
}

/**
 * Builds the HTML content for a Single Vehicle Report Page
 */
function buildVehiclePageHtml(
  quote: Quote,
  pageIndex: number,
  totalPages: number,
  options: {
    policies: Policy[];
    endorsements: PolicyEndorsement[];
    reportDateStr: string;
    agencyTitle?: string;
  }
): string {
  const isRenewal = (quote.businessType || 'Yenileme') === 'Yenileme';
  const prevPolicy = findPreviousPolicy(quote, options.policies);
  const prevData = getPreviousPolicyOriginalData(prevPolicy, quote, options.endorsements);
  const { offers, lowestOffer, selectedCompanyKey } = getNormalizedOffers(quote);

  // Currency & Values
  const thisYearValue = quote.vehicleValue && quote.vehicleValue > 0 ? quote.vehicleValue : null;
  const lastYearValue = prevData.originalVehicleValue && prevData.originalVehicleValue > 0 ? prevData.originalVehicleValue : null;
  const lastYearPrem = prevData.originalPremium && prevData.originalPremium > 0 ? prevData.originalPremium : null;
  const thisYearBestPrem = lowestOffer && lowestOffer.premium ? lowestOffer.premium : null;

  // Percentage Calculations
  let valueChangeText = '—';
  let valueChangeClass = 'color: #64748b; background: #f1f5f9;';
  if (thisYearValue && lastYearValue) {
    const change = ((thisYearValue - lastYearValue) / lastYearValue) * 100;
    const sign = change >= 0 ? '+' : '';
    valueChangeText = `${sign}${change.toFixed(1)}%`;
    valueChangeClass = change >= 0 ? 'color: #0369a1; background: #e0f2fe; border: 1px solid #bae6fd;' : 'color: #b91c1c; background: #fee2e2; border: 1px solid #fecaca;';
  }

  let premChangeText = '—';
  let premChangeClass = 'color: #64748b; background: #f1f5f9;';
  if (thisYearBestPrem && lastYearPrem) {
    const change = ((thisYearBestPrem - lastYearPrem) / lastYearPrem) * 100;
    const sign = change >= 0 ? '+' : '';
    premChangeText = `${sign}${change.toFixed(1)}%`;
    premChangeClass = change <= 0 ? 'color: #15803d; background: #dcfce7; border: 1px solid #bbf7d0;' : 'color: #b45309; background: #fef3c7; border: 1px solid #fde68a;';
  }

  // 6 Companies Table Rows
  const companyTableRowsHtml = offers
    .map((item) => {
      const isLowest = lowestOffer && lowestOffer.key === item.key && item.isReceived;
      const isSelected = selectedCompanyKey && selectedCompanyKey === item.key;

      let rowBg = '#ffffff';
      let borderStyle = 'border-bottom: 1px solid #e2e8f0;';
      let primDisplay = item.premiumStr;
      let primColor = '#0f172a';

      if (isLowest) {
        rowBg = '#f0fdf4';
        borderStyle = 'border-bottom: 1px solid #bbf7d0;';
        primColor = '#166534';
      }

      if (!item.isReceived) {
        primColor = '#94a3b8';
        primDisplay = '<span style="color: #94a3b8; font-style: italic;">Teklif alınamadı</span>';
      }

      return `
        <tr style="background: ${rowBg}; ${borderStyle} font-size: 11px;">
          <td style="padding: 9px 12px; font-weight: 700; color: #1e293b;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span>${item.company}</span>
              ${isSelected ? '<span style="font-size: 9px; font-weight: 700; color: #1d4ed8; background: #dbeafe; padding: 1px 6px; border-radius: 4px; border: 1px solid #bfdbfe;">Seçilen Teklif</span>' : ''}
              ${isLowest ? '<span style="font-size: 9px; font-weight: 700; color: #15803d; background: #dcfce7; padding: 1px 6px; border-radius: 4px; border: 1px solid #bbf7d0;">★ En Uygun Fiyat</span>' : ''}
            </div>
            ${item.notes ? `<div style="font-size: 10px; color: #64748b; font-weight: 500; font-style: italic; margin-top: 2px;">${item.notes}</div>` : ''}
          </td>
          <td style="padding: 9px 12px; text-align: right; font-weight: 800; font-size: 12px; color: ${primColor};">
            ${primDisplay}
          </td>
          <td style="padding: 9px 12px; text-align: center; font-size: 11px; color: #475569; font-weight: 700; letter-spacing: 0.5px;">
            ${item.quoteNumber}
          </td>
        </tr>
      `;
    })
    .join('');

  // Current Policy info for vehicle card
  const currentPolicyCompany = prevData.company !== '—' ? prevData.company : (quote.kaskoCompany || quote.trafficCompany || '—');
  const resolvedPrevEndDate = quote.previousEndDate || prevPolicy?.endDate || quote.kaskoEndDate || quote.trafficEndDate || '';
  const currentPolicyEndDateStr = resolvedPrevEndDate ? formatDateTr(resolvedPrevEndDate) : '—';

  // Format Helper for clean display (dash '-' if empty or undefined)
  const formatVal = (v: any): string => {
    if (v === undefined || v === null || String(v).trim() === '') return '—';
    return String(v).trim();
  };

  return `
    <div class="pdf-page" style="width: 794px; min-height: 1122px; padding: 32px 38px; box-sizing: border-box; background: #ffffff; color: #0f172a; position: relative;">
      <!-- Page Top Header -->
      <div style="border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: flex-end;">
        <div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 9px; font-weight: 800; letter-spacing: 1.5px; color: #2563eb; text-transform: uppercase;">TEKLİF DETAY VE FİYAT RAPORU</span>
            <span style="font-size: 10px; font-weight: 800; background: #0f172a; color: #ffffff; padding: 2px 8px; border-radius: 4px; letter-spacing: 0.5px;">${quote.plate || 'PLAKASIZ'}</span>
            <span style="font-size: 10px; font-weight: 700; background: ${isRenewal ? '#eff6ff' : '#ecfdf5'}; color: ${isRenewal ? '#1d4ed8' : '#047857'}; border: 1px solid ${isRenewal ? '#bfdbfe' : '#a7f3d0'}; padding: 2px 8px; border-radius: 9999px;">${quote.businessType || 'Yenileme'}</span>
          </div>
          <h2 style="margin: 4px 0 0 0; font-size: 16px; font-weight: 900; color: #0f172a; letter-spacing: -0.2px;">${quote.insured || 'Müşteri Belirtilmemiş'}</h2>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 9px; color: #64748b; font-weight: 600;">RAPOR TARİHİ</div>
          <div style="font-size: 11px; font-weight: 800; color: #0f172a;">${options.reportDateStr}</div>
        </div>
      </div>

      <!-- Section 1 & 2: Info Grid (2 Columns) -->
      <div style="display: grid; grid-template-columns: 1fr 1.15fr; gap: 12px; margin-bottom: 14px;">
        <!-- Left: Customer, Process & Period Dates -->
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 11px;">
          <div style="font-size: 10px; font-weight: 800; color: #1e3a8a; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">
            MÜŞTERİ, İŞLEM VE POLİÇE DÖNEMİ
          </div>
          <table style="width: 100%; font-size: 9.5px; border-collapse: collapse;">
            <tr>
              <td style="padding: 2.5px 0; color: #64748b; font-weight: 600; width: 135px;">Sigortalı Ünvanı:</td>
              <td style="padding: 2.5px 0; font-weight: 700; color: #0f172a;">${quote.insured || '—'}</td>
            </tr>
            <tr>
              <td style="padding: 2.5px 0; color: #64748b; font-weight: 600;">Poliçe Branşı:</td>
              <td style="padding: 2.5px 0; font-weight: 700; color: #0f172a;">${quote.branch || 'Kasko'}</td>
            </tr>
            <tr>
              <td style="padding: 2.5px 0; color: #64748b; font-weight: 600;">İşlem Türü:</td>
              <td style="padding: 2.5px 0; font-weight: 700; color: #0f172a;">${quote.businessType || 'Yenileme'}</td>
            </tr>
            <tr>
              <td style="padding: 2.5px 0; color: #64748b; font-weight: 600;">Teklif / Tanzim Tarihi:</td>
              <td style="padding: 2.5px 0; font-weight: 700; color: #0f172a;">${quote.issueDate ? formatDateTr(quote.issueDate) : (quote.quoteDate ? formatDateTr(quote.quoteDate) : options.reportDateStr)}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0 2px 0; border-top: 1px dashed #cbd5e1; color: #0369a1; font-weight: 700;" colspan="2">
                POLİÇE & TEKLİF DÖNEM BİLGİLERİ
              </td>
            </tr>
            <tr>
              <td style="padding: 2.5px 0; color: #64748b; font-weight: 600;">Mevcut Poliçe Bitiş Tarihi:</td>
              <td style="padding: 2.5px 0; font-weight: 800; color: #b45309;">${currentPolicyEndDateStr}</td>
            </tr>
            <tr>
              <td style="padding: 2.5px 0; color: #64748b; font-weight: 600;">Yeni Teklif Başlangıç:</td>
              <td style="padding: 2.5px 0; font-weight: 800; color: #0f172a;">${quote.startDate ? formatDateTr(quote.startDate) : (resolvedPrevEndDate ? formatDateTr(resolvedPrevEndDate) : '—')}</td>
            </tr>
            <tr>
              <td style="padding: 2.5px 0; color: #64748b; font-weight: 600;">Yeni Teklif Bitiş:</td>
              <td style="padding: 2.5px 0; font-weight: 800; color: #0f172a;">${quote.endDate ? formatDateTr(quote.endDate) : '—'}</td>
            </tr>
            ${isRenewal ? `
            <tr>
              <td style="padding: 2.5px 0; color: #64748b; font-weight: 600;">Mevcut Sigorta Şirketi:</td>
              <td style="padding: 2.5px 0; font-weight: 700; color: #475569;">${currentPolicyCompany}</td>
            </tr>
            ` : ''}
          </table>
        </div>

        <!-- Right: Comprehensive Vehicle Information -->
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 11px;">
          <div style="font-size: 10px; font-weight: 800; color: #1e3a8a; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">
            DETAYLI ARAÇ BİLGİLERİ
          </div>
          <table style="width: 100%; font-size: 9.5px; border-collapse: collapse;">
            <tr>
              <td style="padding: 2px 0; color: #64748b; font-weight: 600; width: 125px;">Plaka:</td>
              <td style="padding: 2px 0; font-weight: 800; color: #0f172a; letter-spacing: 0.5px;">${formatVal(quote.plate)}</td>
            </tr>
            <tr>
              <td style="padding: 2px 0; color: #64748b; font-weight: 600;">Marka / Model:</td>
              <td style="padding: 2px 0; font-weight: 700; color: #0f172a;">${formatVal([quote.vehicleBrand, quote.vehicleModel].filter(Boolean).join(' '))}</td>
            </tr>
            <tr>
              <td style="padding: 2px 0; color: #64748b; font-weight: 600;">Model Yılı / Yakıt:</td>
              <td style="padding: 2px 0; font-weight: 700; color: #0f172a;">${formatVal(quote.vehicleYear)} / ${formatVal(quote.fuelType)}</td>
            </tr>
            <tr>
              <td style="padding: 2px 0; color: #64748b; font-weight: 600;">Kullanım Tarzı:</td>
              <td style="padding: 2px 0; font-weight: 700; color: #0f172a;">${formatVal(quote.usageStyle || 'OTOMOBİL')}</td>
            </tr>
            <tr>
              <td style="padding: 2px 0; color: #64748b; font-weight: 600;">Araç Kasko Bedeli:</td>
              <td style="padding: 2px 0; font-weight: 800; color: #1e3a8a;">${thisYearValue ? formatCurrency(thisYearValue) : '—'}</td>
            </tr>
            <tr>
              <td style="padding: 2px 0; color: #64748b; font-weight: 600;">Ruhsat Belge Seri No:</td>
              <td style="padding: 2px 0; font-weight: 700; color: #0f172a; letter-spacing: 0.5px;">${formatVal(quote.licenseSerialNo)}</td>
            </tr>
            <tr>
              <td style="padding: 2px 0; color: #64748b; font-weight: 600;">Araç Kodu:</td>
              <td style="padding: 2px 0; font-weight: 700; color: #0f172a; letter-spacing: 0.5px;">${formatVal(quote.vehicleCode)}</td>
            </tr>
            <tr>
              <td style="padding: 2px 0; color: #64748b; font-weight: 600;">Şasi Numarası:</td>
              <td style="padding: 2px 0; font-weight: 700; color: #0f172a; letter-spacing: 0.5px;">${formatVal(quote.chassisNo)}</td>
            </tr>
            <tr>
              <td style="padding: 2px 0; color: #64748b; font-weight: 600;">Motor Numarası:</td>
              <td style="padding: 2px 0; font-weight: 700; color: #0f172a; letter-spacing: 0.5px;">${formatVal(quote.engineNo)}</td>
            </tr>
          </table>
        </div>
      </div>

      <!-- Section 3: Renewal Comparison (Only for Yenileme) -->
      ${isRenewal ? `
      <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 10px; padding: 14px; margin-bottom: 16px; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.03);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px;">
          <div style="font-size: 10px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">
            YENİLEME KARŞILAŞTIRMASI (GEÇEN YIL vs. BU YIL)
          </div>
          <div style="font-size: 10px; color: #64748b;">
            ${prevData.hasRecord ? '✓ Veritabanı poliçe kaydıyla eşleşti' : '<span style="color: #b45309; font-weight: 600;">* Geçmiş poliçe kaydı bulunamadı</span>'}
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 10px;">
          <!-- Card Left: Last Year -->
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px;">
            <div style="font-size: 10px; font-weight: 800; color: #475569; text-transform: uppercase; margin-bottom: 6px;">
              GEÇEN YILIN POLİÇESİ
            </div>
            <div style="font-size: 11px; font-weight: 700; color: #0f172a;">${prevData.company}</div>
            <div style="font-size: 10px; color: #64748b; margin-top: 4px;">
              Orijinal Prim: <strong style="color: #0f172a; font-size: 11px;">${lastYearPrem ? formatCurrency(lastYearPrem) : '—'}</strong>
            </div>
            <div style="font-size: 10px; color: #64748b; margin-top: 2px;">
              Araç Bedeli: <strong style="color: #0f172a; font-size: 11px;">${lastYearValue ? formatCurrency(lastYearValue) : '—'}</strong>
            </div>
            ${prevData.notes ? `<div style="font-size: 9px; color: #64748b; font-style: italic; margin-top: 4px; padding-top: 4px; border-top: 1px dashed #e2e8f0;">Not: ${prevData.notes}</div>` : ''}
          </div>

          <!-- Card Right: This Year -->
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 10px;">
            <div style="font-size: 10px; font-weight: 800; color: #166534; text-transform: uppercase; margin-bottom: 6px;">
              BU YILIN TEKLİFLERİ
            </div>
            <div style="font-size: 11px; font-weight: 700; color: #15803d;">
              ${lowestOffer ? `${lowestOffer.company} (En Uygun)` : 'Teklif Alındı'}
            </div>
            <div style="font-size: 10px; color: #166534; margin-top: 4px;">
              En Düşük Teklif: <strong style="color: #15803d; font-size: 11px;">${thisYearBestPrem ? formatCurrency(thisYearBestPrem) : '—'}</strong>
            </div>
            <div style="font-size: 10px; color: #166534; margin-top: 2px;">
              Araç Bedeli: <strong style="color: #15803d; font-size: 11px;">${thisYearValue ? formatCurrency(thisYearValue) : '—'}</strong>
            </div>
          </div>
        </div>

        <!-- Change Percentages Row -->
        <div style="display: flex; gap: 10px;">
          <div style="flex: 1; display: flex; align-items: center; justify-content: space-between; padding: 6px 10px; border-radius: 6px; font-size: 10px; font-weight: 600; ${valueChangeClass}">
            <span>Araç Bedeli Değişim Oranı:</span>
            <span style="font-weight: 800; font-size: 11px;">${valueChangeText}</span>
          </div>
          <div style="flex: 1; display: flex; align-items: center; justify-content: space-between; padding: 6px 10px; border-radius: 6px; font-size: 10px; font-weight: 600; ${premChangeClass}">
            <span>Prim Değişim Oranı:</span>
            <span style="font-weight: 800; font-size: 11px;">${premChangeText}</span>
          </div>
        </div>
      </div>
      ` : ''}

      <!-- Section 4: The 6 Companies Comparison Table -->
      <div style="margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <div style="font-size: 10px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">
            SİGORTA ŞİRKETİ TEKLİF KARŞILAŞTIRMASI (6 ŞİRKET)
          </div>
          <div style="font-size: 9px; color: #64748b;">Doğanium & Acente Portföyü</div>
        </div>

        <table style="width: 100%; border-collapse: collapse; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden;">
          <thead>
            <tr style="background: #0f172a; color: #ffffff; font-size: 10px; font-weight: 700; text-transform: uppercase;">
              <th style="padding: 8px 12px; text-align: left; width: 42%;">Sigorta Şirketi</th>
              <th style="padding: 8px 12px; text-align: right; width: 30%;">Teklif Primi</th>
              <th style="padding: 8px 12px; text-align: center; width: 28%;">Teklif Numarası</th>
            </tr>
          </thead>
          <tbody>
            ${companyTableRowsHtml}
          </tbody>
        </table>
      </div>

      <!-- General Quote Note if present -->
      ${quote.notes ? `
      <div style="font-size: 10px; color: #475569; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 12px; margin-bottom: 16px;">
        <strong style="color: #0f172a;">Acente Görüşme / Süreç Notu:</strong> ${quote.notes}
      </div>
      ` : ''}

      <!-- Running Page Footer -->
      <div style="position: absolute; bottom: 26px; left: 42px; right: 42px; border-top: 1px solid #e2e8f0; padding-top: 8px; display: flex; justify-content: space-between; font-size: 9px; color: #94a3b8;">
        <span>Sigorta Acentesi Yönetim Portalı | Operasyon Teklif Raporu</span>
        <span>Sayfa ${pageIndex} / ${totalPages}</span>
      </div>
    </div>
  `;
}

export interface QuotePdfReportOptions {
  policies: Policy[];
  endorsements: PolicyEndorsement[];
  agencyTitle?: string;
  reportTitle?: string;
  filename?: string;
  includeExecutiveSummary?: boolean;
  onProgress?: (progressText: string) => void;
}

/**
 * Main export function: Generates a high-resolution, pixel-perfect PDF using jsPDF + html2canvas
 */
export async function generateQuotesPdfReport(
  quotesToExport: Quote[],
  options: QuotePdfReportOptions
): Promise<void> {
  if (!quotesToExport || quotesToExport.length === 0) {
    throw new Error('PDF raporu oluşturmak için en az bir teklif seçilmelidir.');
  }

  const reportDateStr = formatDateTr(getTodayIso());
  const includeSummary = quotesToExport.length > 1 && options.includeExecutiveSummary !== false;
  const totalPages = quotesToExport.length + (includeSummary ? 1 : 0);

  if (options.onProgress) {
    options.onProgress('Rapor şablonu ve sayfaları hazırlanıyor...');
  }

  // 1. Create temporary off-screen container in DOM
  const container = document.createElement('div');
  container.id = 'pdf-render-stage';
  container.style.position = 'fixed';
  container.style.left = '-10000px';
  container.style.top = '0';
  container.style.width = '794px';
  container.style.background = '#ffffff';
  container.style.zIndex = '-9999';
  container.style.fontFamily = "'Calibri', 'Carlito', 'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif";
  container.style.fontFeatureSettings = "'tnum' on, 'lnum' on";

  let fullHtml = '';

  // If batch & summary enabled, render Executive Summary as Page 1
  if (includeSummary) {
    fullHtml += buildExecutiveSummaryPageHtml(quotesToExport, {
      policies: options.policies,
      endorsements: options.endorsements,
      reportDateStr,
      agencyTitle: options.agencyTitle,
      reportTitle: options.reportTitle,
    });
  }

  // Render individual vehicle pages
  quotesToExport.forEach((q, idx) => {
    const pageNum = idx + 1 + (includeSummary ? 1 : 0);
    fullHtml += buildVehiclePageHtml(q, pageNum, totalPages, {
      policies: options.policies,
      endorsements: options.endorsements,
      reportDateStr,
      agencyTitle: options.agencyTitle,
    });
  });

  container.innerHTML = fullHtml;
  document.body.appendChild(container);

  try {
    // 2. Initialize jsPDF (A4 portrait)
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pageElements = container.querySelectorAll<HTMLElement>('.pdf-page');

    for (let i = 0; i < pageElements.length; i++) {
      if (options.onProgress) {
        options.onProgress(`Sayfa ${i + 1} / ${pageElements.length} yüksek çözünürlükle oluşturuluyor...`);
      }

      const pageEl = pageElements[i];

      // Capture high-DPI canvas
      const canvas = await html2canvas(pageEl, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: 794,
        windowWidth: 794,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);

      if (i > 0) {
        pdf.addPage('a4', 'portrait');
      }

      // Add image to PDF (A4 dimensions: 210 x 297 mm)
      pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
    }

    // Determine filename
    let finalFilename = options.filename;
    if (!finalFilename) {
      if (quotesToExport.length === 1) {
        const cleanPl = (quotesToExport[0].plate || 'Teklif').replace(/\s+/g, '');
        finalFilename = `Teklif_Raporu_${cleanPl}.pdf`;
      } else {
        finalFilename = `Aktif_Teklifler_Raporu_${getTodayIso()}.pdf`;
      }
    }

    if (options.onProgress) {
      options.onProgress('PDF dosyası kaydediliyor...');
    }

    pdf.save(finalFilename);
  } finally {
    // Clean up DOM container
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}
