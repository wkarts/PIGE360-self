"""Verifica as duas portas de entrada da documentação no checkout da PR."""
from pathlib import Path
import re
import unittest
from urllib.parse import unquote, urlsplit


ROOT = Path(__file__).resolve().parents[2]


class DocumentationTests(unittest.TestCase):
    def test_product_guide_points_to_installation_and_current_release(self):
        readme = (ROOT / 'README.md').read_text(encoding='utf-8')
        self.assertRegex(readme, r'\]\(instalacao\.md\)')
        self.assertIn('https://github.com/wkarts/PIGE360-self/releases/latest)', readme)
        self.assertNotRegex(readme, r'(?m)^# .*\b\d+\.\d+\.\d+\b')

    def test_local_links_in_entry_guides_resolve(self):
        for name in ('README.md', 'instalacao.md'):
            guide = ROOT / name
            for href in re.findall(r'\[[^\]\n]+\]\(([^)\s]+)\)', guide.read_text(encoding='utf-8')):
                url = urlsplit(href)
                if url.scheme or url.netloc:
                    continue
                target = guide.parent / unquote(url.path) if url.path else guide
                with self.subTest(guide=name, href=href):
                    self.assertTrue(target.exists(), target)
                    if url.fragment and target.suffix == '.md':
                        headings = re.findall(r'^#{1,6}\s+(.+)$', target.read_text(encoding='utf-8'), re.M)
                        anchors = {re.sub(r'[^\w -]', '', heading.lower()).replace(' ', '-') for heading in headings}
                        self.assertIn(unquote(url.fragment), anchors)
