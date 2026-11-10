#!/usr/bin/env python3
"""Offline cryptographic QR demonstration, never a ZATCA-issued tax invoice.

Generates TLV tags 1–8 using a fresh ephemeral TEST ECDSA secp256k1 key.
The invoice hash is SHA-256 over the supplied test XML bytes (NOT the ZATCA
canonical invoice hash), so it is unsuitable for official Phase 2 verification.
No private key is saved or exported.
"""
import argparse,base64,hashlib,json,re
from pathlib import Path
from datetime import datetime,timezone
from cryptography.hazmat.primitives import hashes,serialization
from cryptography.hazmat.primitives.asymmetric import ec,utils
import qrcode

def tlv(fields):
    result=bytearray()
    for tag,value in fields:
        if len(value)>255: raise ValueError(f"TLV field {tag} exceeds 255 bytes")
        result.extend((tag,len(value)))
        result.extend(value)
    return bytes(result)

def parse(data):
    i=0; fields={}
    while i<len(data):
        if i+2>len(data):raise ValueError('truncated TLV')
        tag,length=data[i:i+2];i+=2
        if i+length>len(data) or tag in fields:raise ValueError('invalid TLV')
        fields[tag]=data[i:i+length];i+=length
    return fields

def build(xml,seller,vat,total,tax,stamp):
    if not re.fullmatch(r'3\d{13}3',vat):raise ValueError('Demo VAT must have Saudi 15-digit format')
    if not re.fullmatch(r'\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})',stamp):raise ValueError('ISO timestamp required')
    digest=hashlib.sha256(xml).digest()
    key=ec.generate_private_key(ec.SECP256K1())
    der=key.sign(digest,ec.ECDSA(utils.Prehashed(hashes.SHA256())))
    r,s=utils.decode_dss_signature(der)
    signature=r.to_bytes(32,'big')+s.to_bytes(32,'big')
    pub=key.public_key()
    pub.verify(der,digest,ec.ECDSA(utils.Prehashed(hashes.SHA256())))
    pub_bytes=pub.public_bytes(serialization.Encoding.X962,serialization.PublicFormat.UncompressedPoint)
    fields=[(1,seller.encode()),(2,vat.encode()),(3,stamp.encode()),
      (4,f'{float(total):.2f}'.encode()),(5,f'{float(tax):.2f}'.encode()),
      (6,digest),(7,signature),(8,pub_bytes)]
    raw=tlv(fields)
    assert parse(raw)==dict(fields)
    return base64.b64encode(raw).decode(),{'tags':list(range(1,9)),'signatureVerified':True,
      'invoiceHashBase64':base64.b64encode(digest).decode(),
      'hashMethod':'SHA256_RAW_TEST_XML_NOT_ZATCA_CANONICAL_HASH',
      'signatureAlgorithm':'ECDSA-secp256k1-SHA256',
      'tag9':'NOT_AVAILABLE_NO_ZATCA_CERTIFICATE',
      'status':'OFFLINE_DEMO_ONLY_NOT_ZATCA_PHASE2_VALIDATED',
      'warning':'Not an issued tax invoice. Does not implement XAdES, ZATCA invoice canonicalization, CSID, SDK checks or clearance.'}

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--xml',required=True,type=Path)
    p.add_argument('--out',required=True,type=Path)
    p.add_argument('--seller',default='ALIF LABS DEMO')
    p.add_argument('--vat',default='300000000000003')
    p.add_argument('--total',default='115.00')
    p.add_argument('--tax',default='15.00')
    p.add_argument('--timestamp',default=None)
    a=p.parse_args()
    if a.out.exists():raise SystemExit('Output directory already exists; refusing overwrite')
    a.out.mkdir(parents=True)
    stamp=a.timestamp or datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    payload,report=build(a.xml.read_bytes(),a.seller,a.vat,a.total,a.tax,stamp)
    (a.out/'DEMO_QR_PAYLOAD.txt').write_text(payload)
    (a.out/'DEMO_VALIDATION.json').write_text(json.dumps(report,indent=2))
    qr=qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M,box_size=10,border=4)
    qr.add_data(payload);qr.make(fit=True)
    qr.make_image(fill_color='black',back_color='white').save(a.out/'DEMO_QR.png')
    print('Offline demo generated; NOT Phase 2 approval:',a.out)

if __name__=='__main__':main()
