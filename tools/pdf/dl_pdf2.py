import json, sys
from reportlab.lib.pagesizes import A4, landscape
from reportlab.pdfgen import canvas
from reportlab.platypus import Table, TableStyle, Paragraph
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
D='/usr/share/fonts/truetype/dejavu/'
pdfmetrics.registerFont(TTFont('S',D+'DejaVuSans.ttf')); pdfmetrics.registerFont(TTFont('SB',D+'DejaVuSans-Bold.ttf'))
pdfmetrics.registerFontFamily('S',normal='S',bold='SB')
song=json.load(open(sys.argv[2] if len(sys.argv)>2 else 'dl.json')); steps=song['steps']
AM=['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B']; LA=['Do','Do♯','Re','Re♯','Mi','Fa','Fa♯','Sol','Sol♯','La','La♯','Si']
am=lambda m:f"{AM[m%12]}{m//12-1}"; la=lambda m:LA[m%12]
NAME={0:'unísono',1:'2ª menor',2:'2ª mayor',3:'3ª menor',4:'3ª mayor'}
TONES={0:'0',1:'½',2:'1',3:'1½',4:'2'}
t=0; seq=[]
for st in steps:
    if st['rh']: seq.append((int(t/4+1e-9)+1,st['rh'][0]))
    t+=st['dur']
rows=[]; cnt={}; prev=None
for b,m in seq:
    cnt[b]=cnt.get(b,0)+1
    if prev is None: rows.append((f"{b}.{cnt[b]}",am(m),'— (inicio)','Primera nota'))
    else:
        d=abs(m-prev); arrow='' if d==0 else (' ↑' if m>prev else ' ↓')
        mov=f"Igual, 0T: {la(prev)} → {la(m)}" if d==0 else f"{'Sube' if m>prev else 'Baja'} {TONES[d]}T: {la(prev)} → {la(m)}"
        rows.append((f"{b}.{cnt[b]}",f"{am(prev)} → {am(m)}",NAME[d]+arrow,mov))
    prev=m
half=(len(rows)+1)//2
FS=12.5
PAD=2
P=lambda s,b=False: Paragraph(('<b>%s</b>' if b else '%s')%s,ParagraphStyle('x',fontName='S',fontSize=FS,leading=FS*1.25))
def tbl(rs):
    data=[[P('Dónde',True),P('Americana',True),P('Intervalo',True),P('Movimiento',True)]]+[[P(a),P(b_),P(c_),P(d_)] for a,b_,c_,d_ in rs]
    t=Table(data,colWidths=[58,84,90,162])
    t.setStyle(TableStyle([('GRID',(0,0),(-1,-1),0.5,colors.HexColor('#9a9488')),('BACKGROUND',(0,0),(-1,0),colors.HexColor('#e9e4d6')),
        ('VALIGN',(0,0),(-1,-1),'MIDDLE'),('TOPPADDING',(0,0),(-1,-1),2.5),('BOTTOMPADDING',(0,0),(-1,-1),2.5),('LEFTPADDING',(0,0),(-1,-1),4),('RIGHTPADDING',(0,0),(-1,-1),3)]))
    return t
W,H=landscape(A4); c=canvas.Canvas(sys.argv[1],pagesize=(W,H)); c.setTitle('Día de lluvia — mano derecha, intervalos')
c.setFont('SB',19); c.drawString(18,H-34,'Día de lluvia · mano derecha · cada nota con la anterior')
c.setFont('S',12.5); c.drawString(18,H-53,'Dónde = compás.nota (1.4 es la 4.ª nota del compás 1) · T = tono (½T = semitono) · ↑ sube, ↓ baja')
L=tbl(rows[:half]); R=tbl(rows[half:]); y=H-66
w,h=L.wrap(0,0); L.drawOn(c,18,y-h)
w2,h2=R.wrap(0,0); R.drawOn(c,18+388+14,y-h2)
yb=y-max(h,h2)-20
c.setFont('SB',12.5); c.drawString(18,yb,'Medidas:')
c.setFont('S',12.5)
c.drawString(18,yb-17,'Unísono 0T · 2ª menor ½T · 2ª mayor 1T · 3ª menor 1½T · 3ª mayor 2T · 14 compases (c. 13-14: el cierre Mi-Re-Do-Si-La)')
c.drawString(18,yb-34,'Secuencia: E E E D · C D C · E E D C · D · E G F E · F E D C · D D D · E C · E · C D C · D D · C · E D C B · A')
c.save(); print(h,h2,yb-34)
