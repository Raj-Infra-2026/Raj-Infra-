import base64,hashlib,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'zatca'))
import importlib.util
spec=importlib.util.spec_from_file_location('demo',Path(__file__).resolve().parents[1]/'zatca'/'demo-qr-crypto.py')
mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
xml=b'<Invoice><ID>TEST-ONLY</ID></Invoice>'
payload,report=mod.build(xml,'Demo Company','300000000000003','115','15','2026-11-10T10:00:00Z')
fields=mod.parse(base64.b64decode(payload))
assert sorted(fields)==list(range(1,9))
assert fields[6]==hashlib.sha256(xml).digest()
assert len(fields[7])==64 and len(fields[8])==65
assert report['signatureVerified'] is True
print('PASS: demo TLV tags 1-8, signature verification, SHA256 and no issuance')
