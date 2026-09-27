from app.online_schemas import CampaignInput, DEFAULT_GUARDIAN_INSTRUCTIONS, DEFAULT_INSTITUTION_PRIVACY_NOTICE


def test_new_campaign_uses_standard_instructions_and_privacy_notice():
    payload = CampaignInput.model_validate({
        'slug': 'matriculas-2027',
        'title': 'Matrículas 2027',
        'class_group_ids': ['00000000-0000-0000-0000-000000000001'],
        'opens_on': '2026-10-01',
        'closes_on': '2027-01-31',
    })
    assert payload.instructions == DEFAULT_GUARDIAN_INSTRUCTIONS
    assert payload.privacy_notice == DEFAULT_INSTITUTION_PRIVACY_NOTICE
    assert 'não garante vaga nem matrícula' in payload.instructions
    assert 'Os dados não serão comercializados' in payload.privacy_notice
