/** ZATCA Fatoora V2 gateway client. No XML signing, hashing or onboarding is simulated.
 * Production calls require an explicit opt-in and authentic ZATCA-issued CSIDs.
 */
import { Buffer } from 'node:buffer';

export const GATEWAYS = Object.freeze({
  sandbox: 'https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal',
  simulation: 'https://gw-fatoora.zatca.gov.sa/e-invoicing/simulation',
  production: 'https://gw-fatoora.zatca.gov.sa/e-invoicing/core',
});

function required(v, name) { if (typeof v !== 'string' || !v.trim()) throw new Error(`${name} is required`); return v.trim(); }
function decodeBase64(v, name) {
  required(v, name);
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(v)) throw Error(`${name} must be base64`);
  const b = Buffer.from(v, 'base64');
  if (!b.length) throw Error(`${name} must be nonempty`);
  return b;
}
function validateInvoice(payload) {
  if (!payload || typeof payload !== 'object') throw Error('Signed invoice payload object is required');
  required(payload.invoiceHash, 'invoiceHash');
  if (decodeBase64(payload.invoiceHash, 'invoiceHash').length !== 32) throw Error('invoiceHash must be exactly 32 SHA-256 bytes in base64');
  const xml = decodeBase64(payload.invoice, 'invoice').toString('utf8');
  if (!xml.includes('<Invoice') && !xml.includes(':Invoice')) throw Error('invoice must contain signed UBL Invoice XML');
  if (!xml.includes('urn:oasis:names:specification:ubl:schema:xsd:Invoice-2')) throw Error('invoice must be UBL 2.1 XML');
  if (!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(String(payload.uuid || ''))) throw Error('Valid invoice UUID required');
  return {invoiceHash: payload.invoiceHash, uuid: payload.uuid, invoice: payload.invoice};
}
export class ZatcaClient {
  constructor({environment='sandbox', token, secret, productionConfirmation=false, fetchImpl=fetch}={}) {
    if (!Object.hasOwn(GATEWAYS, environment)) throw Error('ZATCA environment must be sandbox, simulation, or production');
    if (environment === 'production' && productionConfirmation !== true) throw Error('Production calls require explicit confirmation');
    this.environment = environment;
    this.base = GATEWAYS[environment];
    this.token = token;
    this.secret = secret;
    this.fetchImpl = fetchImpl;
  }
  async request(path, body, {otp, authenticated=true, clearanceStatus}={}) {
    if (!/^\/[a-zA-Z0-9/-]+$/.test(path)) throw Error('Invalid ZATCA API path');
    const headers = {'accept':'application/json','content-type':'application/json','accept-language':'en','Accept-Version':'V2'};
    if (authenticated) {
      const token=required(this.token,'CSID binarySecurityToken');
      const secret=required(this.secret,'CSID secret');
      headers.authorization = `Basic ${Buffer.from(`${token}:${secret}`,'utf8').toString('base64')}`;
    }
    if (otp !== undefined) headers.OTP = required(otp,'Fatoora OTP');
    if (clearanceStatus !== undefined) headers['Clearance-Status'] = String(clearanceStatus);
    const response = await this.fetchImpl(this.base + path, {method:'POST',headers,body:JSON.stringify(body),signal:AbortSignal.timeout(30000)});
    const raw = await response.text();
    let data;try { data=JSON.parse(raw); } catch { data={message:raw.slice(0,2000)}; }
    return {httpStatus:response.status, ok:response.ok, data};
  }
  async requestComplianceCsid({csrBase64,otp}) {
    decodeBase64(csrBase64,'CSR');
    return this.request('/compliance', {csr:csrBase64}, {otp,authenticated:false});
  }
  async complianceCheck(payload) {return this.request('/compliance/invoices',validateInvoice(payload));}
  async requestProductionCsid({complianceRequestId}) {
    if (!Number.isSafeInteger(Number(complianceRequestId)) || Number(complianceRequestId)<=0) throw Error('Valid complianceRequestId required');
    return this.request('/production/csids',{compliance_request_id:Number(complianceRequestId)});
  }
  async clearance(payload) {return this.request('/invoices/clearance/single',validateInvoice(payload),{clearanceStatus:1});}
  async reporting(payload) {return this.request('/invoices/reporting/single',validateInvoice(payload),{clearanceStatus:0});}
}

/** Treat successful HTTP as transport success only; determine tax authority result separately. */
export function summarizeResponse(operation, result) {
 const data=result.data || {};
 const status= operation==='clearance' ? data.clearanceStatus : operation==='reporting' ? data.reportingStatus : null;
 const accepted = operation==='clearance' ? status==='CLEARED' : operation==='reporting' ? status==='REPORTED' : result.ok;
 return {operation, environment:result.environment, httpStatus:result.httpStatus, accepted:!!accepted, authorityStatus:status || 'UNCONFIRMED', validationResults:data.validationResults || null, response:data};
}
