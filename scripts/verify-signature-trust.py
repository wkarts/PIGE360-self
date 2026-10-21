#!/usr/bin/env python3
"""Verifica offline as âncoras distribuídas; não baixa nem modifica a instalação."""
import hashlib
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'backend'))
from app.signature_trust import bundled_trust_roots

for cert in bundled_trust_roots():
    print(hashlib.sha256(cert.dump()).hexdigest(), cert.subject.human_friendly)
