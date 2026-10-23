#!/usr/bin/env python3
"""Capture actual home and internal pages through real menus, using fictional fixtures."""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
import json
from pathlib import Path
import subprocess
import sys
import tempfile
from threading import Thread
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[2]

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self,*args):pass

def inspect_page(page,theme,width,slug,output):
    page.evaluate('document.fonts.ready')
    page.locator('img').evaluate_all("images=>Promise.all(images.map(image=>{image.loading='eager';return image.decode()}))")
    name=f'{theme}-{slug+"-" if slug else ""}{width}'
    page.screenshot(path=str(output/(name+'.png')),full_page=True)
    assert page.locator('.demonstration-banner').is_visible()
    assert page.locator('.composition-v2').count()==1
    assert page.evaluate('document.documentElement.scrollWidth<=window.innerWidth'),name+': horizontal overflow'
    assert page.locator('.items-grid .items-grid').count()==0,name+': nested content grid'
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
        assert group['width']>=minimum*group['available'],f'{name}: collapsed grid {group}'
        if width>=768:assert all(card>=120 for card in group['cards']),f'{name}: unreadably narrow cards {group}'
    footer=page.locator('.site-footer').bounding_box()
    assert footer and footer['height']<=350,f'{name}: oversized fixture footer {footer}'
    assert footer['y']+footer['height']>=page.viewport_size['height']-1,f'{name}: blank canvas below footer'
    if slug:
        assert page.locator('.is-internal').count()==1
        assert page.locator('.hero-gallery').count()==0,name+': repeated home mosaic'
    else:
        assert page.locator('.content-section').count()<=2,name+': home is not a summary'
    return {'theme':theme,'route':'/'+slug,'width':width,'images':page.locator('img').count(),
            'height':page.evaluate('document.documentElement.scrollHeight'),'footer_height':footer['height'],'geometry':geometry}

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output',type=Path,default=ROOT/'ci-evidence/site-models')
    args=parser.parse_args();args.output.mkdir(parents=True,exist_ok=True)
    results=[]
    with tempfile.TemporaryDirectory(prefix='pige-model-fixtures-') as temporary:
        fixtures=Path(temporary)
        subprocess.run([sys.executable,str(ROOT/'scripts/qa/render-site-models.py'),str(fixtures)],check=True)
        manifest=json.loads((fixtures/'manifest.json').read_text())
        with sync_playwright() as pw:
            browser=pw.chromium.launch()
            try:
                for model in manifest:
                    theme=model['theme'];server=ThreadingHTTPServer(('127.0.0.1',0),partial(QuietHandler,directory=str(fixtures/theme)))
                    thread=Thread(target=server.serve_forever,daemon=True);thread.start()
                    base=f'http://127.0.0.1:{server.server_port}'
                    try:
                        for width in [320,390,768,1440]:
                            page=browser.new_page(viewport={'width':width,'height':1000},device_scale_factor=1)
                            errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
                            response=page.goto(base+'/',wait_until='load');assert response.status==200
                            results.append(inspect_page(page,theme,width,'',args.output))
                            if width<761:
                                toggle=page.locator('.mobile-menu summary');toggle.click()
                                assert page.locator('.mobile-menu').get_attribute('open') is not None
                                page.screenshot(path=str(args.output/f'{theme}-{width}-menu.png'))
                                toggle.click()
                            if width in (390,1440):
                                for route in model['routes'][1:]:
                                    page.goto(base+'/',wait_until='load')
                                    if width<761:page.locator('.mobile-menu summary').click()
                                    nav='.mobile-menu' if width<761 else '.desktop-nav'
                                    page.locator(f'{nav} a[href="/{route["slug"]}"]').click()
                                    page.wait_for_url(base+'/'+route['slug']+'/')
                                    assert page.locator('h1').inner_text()==route['title']
                                    results.append(inspect_page(page,theme,width,route['slug'],args.output))
                                    page.reload(wait_until='load')
                                    assert page.locator('h1').inner_text()==route['title']
                                    # Every configured local destination resolves; no dead card/CTA or missing anchor.
                                    for href in set(page.locator('a[href]').evaluate_all('nodes=>nodes.map(node=>node.getAttribute("href"))')):
                                        if href.startswith('/'):
                                            assert page.request.get(base+href.split('#')[0]).status==200,(theme,route['slug'],href)
                                        elif href.startswith('#'):
                                            assert page.locator('[id="'+href[1:]+'"]').count()==1,(theme,route['slug'],href)
                            assert not errors,errors
                            page.close()
                    finally:server.shutdown();server.server_close();thread.join()
            finally:browser.close()
    (args.output/'measurements.json').write_text(json.dumps(results,indent=2))
    print('Four home compositions + all 24 internal pages navigated, reloaded and captured in real Chromium. Human pixel review is still required.')

if __name__=='__main__':main()
