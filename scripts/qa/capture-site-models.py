#!/usr/bin/env python3
"""Capture the actual model renderer with fictional fixtures; never publish assets."""
import argparse
import json
from pathlib import Path
import subprocess
import sys
import tempfile
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[2]

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output',type=Path,default=ROOT/'ci-evidence/site-models')
    args=parser.parse_args();args.output.mkdir(parents=True,exist_ok=True)
    results=[]
    with tempfile.TemporaryDirectory(prefix='pige-model-fixtures-') as temporary:
        fixtures=Path(temporary)
        subprocess.run([sys.executable,str(ROOT/'scripts/qa/render-site-models.py'),str(fixtures)],check=True)
        with sync_playwright() as pw:
            browser=pw.chromium.launch()
            try:
                for theme in ['horizon','editorial','culture','campus']:
                    for width in [320,390,768,1440]:
                        page=browser.new_page(viewport={'width':width,'height':1000},device_scale_factor=1)
                        errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
                        page.goto((fixtures/(theme+'.html')).as_uri(),wait_until='load')
                        page.evaluate('document.fonts.ready')
                        # Real rendered images, including lazy images further down the page.
                        page.locator('img').evaluate_all("images=>Promise.all(images.map(image=>{image.loading='eager';return image.decode()}))")
                        assert page.locator('.demonstration-banner').is_visible()
                        assert page.locator('.composition-v2').count()==1
                        assert page.evaluate('document.documentElement.scrollWidth<=window.innerWidth'),f'{theme}/{width}: horizontal overflow'
                        assert not errors,errors
                        page.screenshot(path=str(args.output/f'{theme}-{width}.png'),full_page=True)
                        # No-overflow alone misses a grid collapsed inside its first column.
                        # Keep the screenshot even when a geometric regression fails below.
                        assert page.locator('.items-grid .items-grid').count()==0,f'{theme}/{width}: nested content grid'
                        geometry=page.evaluate("""() => [...document.querySelectorAll('.content-section')].flatMap(section=>{
                            const grid=section.querySelector('.section-inner > .items-grid');
                            if(!grid || !grid.getBoundingClientRect().width)return [];
                            return [{section:section.className,width:grid.getBoundingClientRect().width,
                                available:grid.parentElement.getBoundingClientRect().width,
                                cards:[...grid.children].filter(x=>x.matches('.content-item')).map(x=>x.getBoundingClientRect().width)}];
                        })""")
                        for group in geometry:
                            split=theme=='culture' and 'section-steps' in group['section'] and width>760
                            dates='layout-dates' in group['section'] and width>1100
                            minimum=.40 if split else .65 if dates else .95
                            assert group['width']>=minimum*group['available'],f'{theme}/{width}: collapsed grid {group}'
                            if width>=768:
                                assert all(card>=120 for card in group['cards']),f'{theme}/{width}: unreadably narrow cards {group}'
                        if width<761:
                            toggle=page.locator('.mobile-menu summary');toggle.click()
                            assert page.locator('.mobile-menu').get_attribute('open') is not None
                            page.screenshot(path=str(args.output/f'{theme}-{width}-menu.png'))
                            toggle.click()
                        results.append({'theme':theme,'width':width,'images':page.locator('img').count(),'height':page.evaluate('document.documentElement.scrollHeight'),'geometry':geometry,'errors':errors})
                        page.close()
            finally:browser.close()
    (args.output/'measurements.json').write_text(json.dumps(results,indent=2))
    print('Four complete models captured in real Chromium at 320/390/768/1440. Human pixel review is still required.')

if __name__=='__main__':main()
