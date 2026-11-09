/** ZATCA Phase 2 TLV encoder/decoder. Only use values sourced from verified, signed XML.
 * QR encoding is NOT evidence that the underlying certificate or invoice has been accepted.
 */
const te=new TextEncoder();
const BASE64=/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
const b64bytes=(v,name)=>{
 if(typeof v!=='string'||!BASE64.test(v)||!v.length) throw Error(`${name} must be base64`);
 return Uint8Array.from(atob(v),c=>c.charCodeAt(0));
};
const asBytes=(v,name)=>v instanceof Uint8Array?v:typeof v==='string'?b64bytes(v,name):(()=>{throw Error(`${name} needs binary bytes or base64`);})();
export function encodePhase2Qr({sellerName,vatNumber,issuedAt,total,vatTotal,invoiceHash,signature,publicKey,caSignature,kind='simplified'}){
 if(!['standard','simplified'].includes(kind))throw Error('Invalid kind');
 if(!sellerName||!/^3\d{13}3$/.test(String(vatNumber)))throw Error('Seller name and valid VAT number required');
 if(!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:Z|[+-]\d\d:\d\d)$/.test(String(issuedAt)))throw Error('An actual ISO8601 issuance timestamp with offset is required');
 if(!Number.isFinite(Number(total))||Number(total)<0||!Number.isFinite(Number(vatTotal))||Number(vatTotal)<0)throw Error('Invalid invoice totals');
 const pairs=[
  [1,te.encode(sellerName)],[2,te.encode(String(vatNumber))],[3,te.encode(issuedAt)],
  [4,te.encode(Number(total).toFixed(2))],[5,te.encode(Number(vatTotal).toFixed(2))]
 ];
 const hash=asBytes(invoiceHash,'invoiceHash');if(hash.length!==32)throw Error('Invoice hash must contain exactly 32 binary bytes');
 const sig=asBytes(signature,'signature');if(sig.length!==64)throw Error('ECDSA signature must be 64-byte P1363 format');
 const pub=asBytes(publicKey,'publicKey');if(pub.length!==65||pub[0]!==4)throw Error('Expected uncompressed EC public point (65 bytes)');
 pairs.push([6,hash],[7,sig],[8,pub]);
 if(kind==='simplified'){
  const ca=asBytes(caSignature,'caSignature');
  if(!ca.length)throw Error('Simplified QR requires real certificate CA signature in tag 9');
  pairs.push([9,ca]);
 }
 let size=0;
 for(const [tag,value] of pairs){if(value.length>255)throw Error(`Tag ${tag} exceeds one-byte TLV limit`);size+=2+value.length;}
 const out=new Uint8Array(size);let p=0;
 for(const [tag,value] of pairs){out[p++]=tag;out[p++]=value.length;out.set(value,p);p+=value.length;}
 return btoa(Array.from(out,b=>String.fromCharCode(b)).join(''));
}
export function decodeQrTlv(base64){
 const bytes=b64bytes(base64,'QR');let p=0;const fields={};
 while(p<bytes.length){if(p+2>bytes.length)throw Error('Truncated TLV header');const tag=bytes[p++],len=bytes[p++];if(p+len>bytes.length)throw Error('Truncated TLV value');if(fields[tag])throw Error(`Duplicate TLV tag ${tag}`);fields[tag]=bytes.slice(p,p+len);p+=len;}
 return fields;
}
export function parsePhase2Qr(base64){const fields=decodeQrTlv(base64);const td=new TextDecoder();return {sellerName:td.decode(fields[1]||new Uint8Array()),vatNumber:td.decode(fields[2]||new Uint8Array()),issuedAt:td.decode(fields[3]||new Uint8Array()),total:td.decode(fields[4]||new Uint8Array()),vatTotal:td.decode(fields[5]||new Uint8Array()),binaryTags:[6,7,8,9].filter(t=>fields[t]).map(t=>({tag:t,length:fields[t].length}))};}
