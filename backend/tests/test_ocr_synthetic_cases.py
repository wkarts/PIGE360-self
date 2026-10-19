"""Actual OCR worker with reproducible multipage, degraded and invalid inputs."""
import importlib.util
from pathlib import Path

import pytest

from app import ocr_worker
from test_assisted_intake import clean_assistance, upload  # noqa: F401


def synthetic_cases(root):
    path = Path(__file__).resolve().parents[2]/'scripts/evaluate-ocr.py'
    spec = importlib.util.spec_from_file_location('ocr_evaluation', path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return {case['name']: case for case in module.build_cases(root)}


@pytest.mark.parametrize('name,pages', [('multipage_pdf', 3), ('degraded_photo', 1)])
def test_real_worker_multpage_and_degraded_sources_require_human_review(api, tmp_path, name, pages):
    case = synthetic_cases(tmp_path)[name]
    job = upload(api, case['path'].read_bytes(), case['path'].name)
    assert ocr_worker.process_one()
    reply = api.get('/ocr/jobs/'+job['id'])
    assert reply['status'] == 'succeeded', reply
    result = reply['result']
    assert len(result['pages']) == pages and result['requires_review']
    assert not result['document_authenticity_verified']
    assert all(row['requires_review'] for row in result['suggestions'])
    if name == 'multipage_pdf':
        actual = {row['field']: row['value'] for row in result['suggestions']}
        assert all(actual.get(key) == value for key, value in case['expected'].items())
    else:
        # Quality of a degraded photograph is reported, never fabricated as an
        # accuracy guarantee. It remains usable manually even with zero fields.
        assert result['quality'] in {'fields_found', 'needs_better_source'}
        if not result['suggestions']:
            assert result['warnings']
    assert api.get('/persons?q=PESSOA EXEMPLO')['total'] == 0


@pytest.mark.parametrize('name,error', [('over_page_limit', 'pdf_page_limit'),
    ('active_pdf', 'active_pdf'), ('malformed_pdf', 'invalid_or_unreadable_document')])
def test_real_worker_safely_rejects_invalid_pdf_then_processes_next_job(api, tmp_path, name, error):
    cases = synthetic_cases(tmp_path)
    case = cases[name]
    job = upload(api, case['path'].read_bytes(), case['path'].name)
    assert ocr_worker.process_one()
    failed = api.get('/ocr/jobs/'+job['id'])
    assert failed['status'] == 'failed' and failed['error_code'] == error, failed
    assert failed['result'] is None
    healthy = cases['digital_pdf']
    recovery = upload(api, healthy['path'].read_bytes(), healthy['path'].name)
    assert ocr_worker.process_one()
    assert api.get('/ocr/jobs/'+recovery['id'])['status'] == 'succeeded'
