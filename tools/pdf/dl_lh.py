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
steps=json.load(open(sys.argv[2] if len(sys.argv)>2 else 'dl.json'))['steps']
AM=['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B']; LA=['Do','Do♯','Re','Re♯','Mi','Fa','Fa♯','Sol','Sol♯','La','La♯','Si']
am=lambda m:f"{AM[m%12]}{m//12-1}"; la=lambda m:LA[m%12]
NAME={0:'unísono',1:'2ª menor',2:'2ª mayor',3:'3ª menor',4:'3ª mayor',5:'4ª justa',7:'5ª justa'}
TON={0:'0',1:'½',2:'1',3:'1½',4:'2',5:'2½',7:'3½'}
t=0; ev=[]
for st in steps:
    if st['lh']: ev.append((int(t/4+1e-9)+1,st['lh'],st['lhF'],t-4*int(t/4+1e-9)))
    t+=st['dur']
rows=[]; prev=None
for b,ns,fs,bt in ev:
    b=f"{b} (t. {int(bt)+1})" if bt else b
    low=min(ns); f_low=fs[ns.index(low)]
    if prev is None: rows.append((str(b),am(low),str(f_low),'— (inicio)','Primera nota'))
    else:
        d=abs(low-prev); arrow='' if d==0 else (' ↑' if low>prev else ' ↓')
        mov=f"Igual, 0T: {la(prev)} → {la(low)}" if d==0 else f"{'Sube' if low>prev else 'Baja'} {TON[d]}T: {la(prev)} → {la(low)}"
        rows.append((str(b),f"{am(prev)} → {am(low)}",str(f_low),NAME[d]+arrow,mov))
    if len(ns)>1:
        d=ns[1]-ns[0]
        rows.append((f"{b} (a la vez)",f"{am(ns[0])} + {am(ns[1])}",f"{fs[0]} y {fs[1]}",NAME[d],f"Dos teclas juntas: {la(ns[0])} y {la(ns[1])}, {TON[d]}T"))
    prev=low
FS=12.5
P=lambda s,b=False: Paragraph(('<b>%s</b>' if b else '%s')%s,ParagraphStyle('x',fontName='S',fontSize=FS,leading=FS*1.25))
data=[[P(h,True) for h in ('Compás','Americana','Dedo','Intervalo','Movimiento')]]+[[P(x) for x in r] for r in rows]
tb=Table(data,colWidths=[100,120,60,110,330])
tb.setStyle(TableStyle([('GRID',(0,0),(-1,-1),0.5,colors.HexColor('#9a9488')),('BACKGROUND',(0,0),(-1,0),colors.HexColor('#e9e4d6')),('VALIGN',(0,0),(-1,-1),'MIDDLE'),
  ('TOPPADDING',(0,0),(-1,-1),2),('BOTTOMPADDING',(0,0),(-1,-1),2),
  *[('BACKGROUND',(0,i),(-1,i),colors.HexColor('#f3efe3')) for i,r in enumerate(data) if i>0 and 'a la vez' in rows[i-1][0]]]))
W,H=landscape(A4); c=canvas.Canvas(sys.argv[1],pagesize=(W,H)); c.setTitle('Día de lluvia — mano izquierda, intervalos')
c.setFont('SB',19); c.drawString(30,H-34,'Día de lluvia · mano izquierda · cada nota con la anterior')
c.setFont('S',12.5); c.drawString(30,H-53,'En la izquierda se compara la nota más grave de cada compás · T = tono (½T = semitono) · ↑ sube, ↓ baja · 1 = pulgar')
w,h=tb.wrap(0,0); tb.drawOn(c,30,H-66-h)
y=H-66-h-20
c.setFont('SB',12.5); c.drawString(30,y,'Medidas:'); c.setFont('S',12.5)
c.drawString(30,y-17,'Unísono 0T · 2ª mayor 1T · 3ª menor 1½T · 3ª mayor 2T · 4ª justa 2½T · 5ª justa 3½T')
c.drawString(30,y-34,'Secuencia (nota más grave): A F C G · A F G A · A F G A · F G · A')
c.save(); print(len(rows),y-34)
