#!/usr/bin/env python3
"""Render self-contained public-model fixtures for screenshot review, never publish.

Usage: python scripts/qa/render-site-models.py /path/outside/repository
Uses generic generated demonstration photos and fictional identity, not tenant data.
"""
import argparse
import base64
import importlib.util
import json
from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[2]

def module(name, file):
    spec=importlib.util.spec_from_file_location(name,ROOT/file)
    result=importlib.util.module_from_spec(spec);spec.loader.exec_module(result)
    return result


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('output',type=Path)
    args=parser.parse_args();out=args.output.resolve()
    if out==ROOT or ROOT in out.parents:
        parser.error('Use a directory outside the repository for generated artifacts.')
    out.mkdir(parents=True,exist_ok=True)
    models=module('qa_site_models','backend/app/website_models.py')
    renderer=module('qa_site_renderer','backend/app/website_render.py')
    manifest=[]
    for model in models.catalog()['items']:
        site=model['website']
        data={'school':{'name':'SUA ESCOLA','address':'Endereço ilustrativo — substitua no PIGE','email':'','phone':''},
              'identity':{'display_name':'SUA ESCOLA','primary_color':'#A68B52','secondary_color':'#17334B','font_family':'system'},
              'website':site,'posts':[]}
        document=renderer.render(data)
        # Asset inlining is confined to this QA artifact; public renderer still rejects data URLs.
        for name in models.ASSET_NAMES:
            url=models.ASSET_PREFIX+name+'.jpg'
            encoded=base64.b64encode((models.ASSET_ROOT/(name+'.jpg')).read_bytes()).decode()
            document=document.replace(url,'data:image/jpeg;base64,'+encoded)
        document=re.sub(r'<link[^>]*>', '',document)
        path=out/(site['theme']+'.html');path.write_text(document)
        manifest.append({'theme':site['theme'],'file':path.name,'fixture':'fictional, AI demonstration photos','widths':[390,1440]})
    (out/'manifest.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False))
    print(json.dumps({'output':str(out),'models':len(manifest),'screenshots':'pending real browser'},ensure_ascii=False))

if __name__=='__main__':main()
