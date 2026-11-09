#!/usr/bin/env python3
"""Cryptographic engineering workbench; NOT a ZATCA-compliant XAdES signer.

Signs the SHA-256 of a transformed XML document with ECDSA secp256k1, emits
verifiable 64-byte P1363 signature, public key and invoice hash. XML canonical
form currently uses lxml C14N 1.0, NOT the required exact XAdES/C14N 1.1
profile; do not submit its artifacts as tax invoices. The private key stays out
of generated files. Requires lxml and cryptography.
"""
import argparse,base64,hashlib,json,sys
from copy import deepcopy
from pathlib import Path
from lxml import etree
from cryptography.hazmat.primitives import hashes,serialization
from cryptography.hazmat.primitives.asymmetric import ec,utils

NS={'cac':'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2','cbc':'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2','ext':'urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2'}
def canonical_invoice(xml_bytes):
    root=etree.fromstring(xml_bytes,parser=etree.XMLParser(resolve_entities=False,no_network=True,remove_blank_text=False))
    if etree.QName(root).localname!='Invoice':raise ValueError('Only UBL Invoice supported')
    clone=deepcopy(root)
    for node in clone.xpath('./ext:UBLExtensions|./cac:Signature|./cac:AdditionalDocumentReference[cbc:ID="QR"]',namespaces=NS):node.getparent().remove(node)
    return etree.tostring(clone,method='c14n',exclusive=False,with_comments=False)
def get_signature(hash_bytes,key):
    der=key.sign(hash_bytes,ec.ECDSA(utils.Prehashed(hashes.SHA256())))
    r,s=utils.decode_dss_signature(der)
    return r.to_bytes(32,'big')+s.to_bytes(32,'big')
def check_signature(hash_bytes,raw,public):
    if len(raw)!=64:raise ValueError('Signature must be 64 bytes')
    der=utils.encode_dss_signature(int.from_bytes(raw[:32],'big'),int.from_bytes(raw[32:],'big'))
    public.verify(der,hash_bytes,ec.ECDSA(utils.Prehashed(hashes.SHA256())))
def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('unsigned_xml',type=Path)
    p.add_argument('--private-key',type=Path,required=True,help='Existing authorized PEM file; NEVER bundle in ZIP')
    p.add_argument('--out',type=Path,required=True,help='Local test evidence JSON, create-only')
    args=p.parse_args()
    key=serialization.load_pem_private_key(args.private_key.read_bytes(),password=None)
    if not isinstance(key,ec.EllipticCurvePrivateKey) or key.curve.name!='secp256k1':raise ValueError('ZATCA ECDSA requires secp256k1 key')
    canonical=canonical_invoice(args.unsigned_xml.read_bytes());digest=hashlib.sha256(canonical).digest()
    sig=get_signature(digest,key);pub=key.public_key()
    check_signature(digest,sig,pub)
    public_bytes=pub.public_bytes(serialization.Encoding.X962,serialization.PublicFormat.UncompressedPoint)
    report={'status':'LOCAL_CRYPTO_TEST_ONLY_NOT_XADES_NOT_ZATCA_VALIDATED','algorithm':'ECDSA-secp256k1-SHA256','canonicalization':'C14N1.0_LOCAL_TEST_ONLY','invoiceHash':base64.b64encode(digest).decode(),'signature':base64.b64encode(sig).decode(),'publicKey':base64.b64encode(public_bytes).decode(),'xmlSha256':hashlib.sha256(args.unsigned_xml.read_bytes()).hexdigest(),'warning':'Not XAdES; no ZATCA CSID/certificate chain, C14N1.1 or SDK validation. Do not submit.'}
    with args.out.open('x',encoding='utf8') as f:json.dump(report,f,indent=2)
    print(f'Local cryptographic sign+verify PASS: {args.out}; NOT suitable for ZATCA submission')
if __name__=='__main__':
    try:main()
    except Exception as e:print(f'Error: {e}',file=sys.stderr);sys.exit(1)
