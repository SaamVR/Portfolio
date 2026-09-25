from pathlib import Path
import re
ROOT=Path(__file__).resolve().parents[1]

def build_html(empty=False):
    html=(ROOT/'index.html').read_text()
    css=(ROOT/'styles.css').read_text()
    dash=(ROOT/'dashboard.js').read_text()
    app=(ROOT/'app.js').read_text()
    if empty:
        app=re.sub(r'const starter=\[.*?\n\];\nfunction loadLeads', 'const starter=[];\nfunction loadLeads', app, count=1, flags=re.S)
    html=re.sub(r'<link rel="preconnect"[^>]*>','',html)
    html=re.sub(r'<link href="https://fonts.googleapis.com[^>]*>','',html)
    html=html.replace('<link rel="stylesheet" href="./styles.css" />',f'<style>{css}</style>')
    html=html.replace('<script src="./dashboard.js"></script>',f'<script>{dash}</script>')
    html=html.replace('<script src="./app.js"></script>',f'<script>{app}</script>')
    return html
