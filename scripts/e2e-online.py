#!/usr/bin/env python3
"""Entrada estável do CI para matrícula, portal, boletim e operação bancária."""
import os
import runpy
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
os.environ.setdefault('PIGE_E2E_EVIDENCE_DIR', str(ROOT / 'evidence/0.3.0/online'))
runpy.run_path(str(ROOT / 'scripts/e2e-portal-polished.py'), run_name='__main__')
