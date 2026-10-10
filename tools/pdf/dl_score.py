import json, math
from reportlab.lib.pagesizes import A4, landscape
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
D='/usr/share/fonts/truetype/dejavu/'
pdfmetrics.registerFont(TTFont('S',D+'DejaVuSans.ttf')); pdfmetrics.registerFont(TTFont('SB',D+'DejaVuSans-Bold.ttf'))
song=json.load(open('dl.json')); steps=song['steps']
LET={0:0,2:1,4:2,5:3,7:4,9:5,11:6}; ANAME='CDEFGAB'; LNAME=['Do','Re','Mi','Fa','Sol','La','Si']
pos=lambda m:(m//12-1)*7+LET[m%12]
am=lambda m:f"{ANAME[LET[m%12]]}{m//12-1}"
# eventos
t=0; rh=[]; lh=[]
for st in steps:
    b=int(t/4+1e-9); beat=t-4*b
    if st['rh']: rh.append(dict(bar=b,beat=beat,dur=st['dur'] if not st.get('rhDur') else st['rhDur'],n=st['rh'][0],f=st['rhF'][0]))
    if st['lh']: lh.append(dict(bar=b,beat=beat,dur=4,ns=st['lh'],fs=st['lhF'],t=t))
    t+=st['dur']
# duraciones reales de la derecha: hasta la siguiente
for i,e in enumerate(rh):
    nxt=rh[i+1] if i+1<len(rh) else None
    end=(nxt['bar']*4+nxt['beat']) if nxt else t
    e['dur']=round(end-(e['bar']*4+e['beat']),3)
TOT=t
for i,e in enumerate(lh):
    e['dur']=(lh[i+1]['t'] if i+1<len(lh) else TOT)-e['t']
CH=['Lam','Fa','Do','Sol','Lam','Fa','Sol','Lam','Lam','Fa','Sol','Lam','Fa → Sol','Lam']
W,H=landscape(A4); c=canvas.Canvas('dia-de-lluvia-partitura.pdf',pagesize=(W,H)); c.setTitle('Día de lluvia — partitura con dedos')
GC=ImageReader('clef_g.png'); FC=ImageReader('clef_f.png')
ss=10; SX0=30; BX0=116; BW=(W-30-BX0)/7
def staff(x0,x1,ybot):
    c.setLineWidth(0.8)
    for i in range(5): c.line(x0,ybot+i*ss,x1,ybot+i*ss)
def head(x,y,kind):
    c.saveState(); c.translate(x,y)
    if kind=='w':
        c.setLineWidth(1.9); c.ellipse(-ss*0.72,-ss*0.46,ss*0.72,ss*0.46,stroke=1,fill=0)
        c.restoreState(); return
    c.rotate(20)
    if kind=='q': c.ellipse(-ss*0.62,-ss*0.43,ss*0.62,ss*0.43,stroke=0,fill=1)
    else: c.setLineWidth(1.7); c.ellipse(-ss*0.58,-ss*0.4,ss*0.58,ss*0.4,stroke=1,fill=0)
    c.restoreState()
def ledgers(x,p,bottom_pos,y_of):
    c.setLineWidth(0.9)
    if p<=bottom_pos-2:
        q=bottom_pos-2
        while q>=p:
            y=y_of(q); c.line(x-ss*1.0,y,x+ss*1.0,y); q-=2
def draw_system(s,y_top):
    b0=s*7
    tre_bot=y_top-4*ss; bas_top=tre_bot-56; bas_bot=bas_top-4*ss
    x1=BX0+7*BW
    staff(SX0+8,x1,tre_bot); staff(SX0+8,x1,bas_bot)
    c.setLineWidth(1.2); c.line(SX0+8,y_top,SX0+8,bas_bot)
    # claves
    c.drawImage(GC,SX0+14,tre_bot-ss*1.15,width=ss*2.0,height=ss*7.0,mask='auto')
    c.drawImage(FC,SX0+14,bas_top-ss*0.1-ss*3.3+ss*0.35,width=ss*2.7,height=ss*3.35,mask='auto')
    if s==0:
        c.setFont('SB',24)
        c.drawCentredString(BX0-24,tre_bot+ss*2-8+ss*0.0+ss*0.0,'4'); c.drawCentredString(BX0-24,tre_bot+ss*0-2+0,'4')
        c.drawCentredString(BX0-24,bas_bot+ss*2-8+0,'4'); c.drawCentredString(BX0-24,bas_bot+ss*0-2,'4')
    ytre=lambda p: tre_bot+(p-30)*ss/2; ybas=lambda p: bas_bot+(p-18)*ss/2
    for k in range(7):
        b=b0+k*0+k; bx=BX0+k*BW
        # barras
        c.setLineWidth(0.9 if k<5 or s==0 and False else 0.9)
        if k<6 or b0+k<13: c.line(bx+BW,tre_bot,bx+BW,y_top); c.line(bx+BW,bas_bot,bx+BW,bas_top)
        if b0+k<11: c.line(bx+BW,bas_top,bx+BW,y_top-0) if False else None
        if k==6 and s==1:
            c.setLineWidth(2.6); c.line(bx+BW+3,tre_bot,bx+BW+3,y_top); c.line(bx+BW+3,bas_bot,bx+BW+3,bas_top)
        bar=b0+k
        # etiqueta de compás y acorde
        c.setFont('SB',13); c.drawString(bx+5,y_top+36,f"{bar+1}"); wn=pdfmetrics.stringWidth(f"{bar+1}",'SB',13); c.setFont('S',13); c.drawString(bx+5+wn+6,y_top+36,CH[bar])
        xs=lambda beat:bx+14+beat*(BW-26)/4
        for e in [e for e in rh if e['bar']==bar]:
            x=xs(e['beat']); p=pos(e['n']); y=ytre(p)
            kind='w' if e['dur']>=4 else 'h' if e['dur']>=2 else 'q'
            ledgers(x,p,30,ytre); head(x,y,kind)
            if kind!='w':
                c.setLineWidth(1.1)
                if p<34: c.line(x+ss*0.55,y+1,x+ss*0.55,y+ss*3.4)
                else: c.line(x-ss*0.55,y-1,x-ss*0.55,y-ss*3.4)
            c.setFont('SB',15); c.drawCentredString(x,y_top+13,str(e['f']))
            c.setFont('S',13); (c.drawCentredString(x,tre_bot-28,am(e['n'])[0]) if p>=28 else c.drawString(x+ss*1.15,y-4,am(e['n'])[0]))
        for e in [e for e in lh if e['bar']==bar]:
            x=xs(e['beat']); ps=[pos(n) for n in e['ns']]
            kind='w' if e['dur']>=4 else 'h'
            for p in ps: ledgers(x,p,18,ybas); head(x,ybas(p),kind)
            if kind=='h':
                c.setLineWidth(1.1); top=max(ps); bot=min(ps)
                c.line(x+ss*0.55,ybas(bot)+1,x+ss*0.55,ybas(top)+ss*3.4)
            c.setFont('SB',15)
            for i,(n,f) in enumerate(sorted(zip(e['ns'],e['fs']),reverse=True)):
                c.drawCentredString(x,bas_bot-23-i*16,str(f))
            c.setFont('S',13); c.drawCentredString(x,bas_top+11,' '.join(am(n)[0] for n in e['ns']))
    return bas_bot
c.setFont('SB',20); c.drawString(30,H-34,'Día de lluvia · partitura con dedos')
c.setFont('S',12.5); c.drawString(30,H-53,'La menor · 4/4 · ♩ = 60 · arriba la mano derecha (clave de Sol), abajo la izquierda (clave de Fa)')
c.drawString(30,H-69,'Números grandes = dedos (1 pulgar … 5 meñique). Nombres: C Do · D Re · E Mi · F Fa · G Sol · A La · B Si.')
y=H-130
yb=draw_system(0,y)
yb2=draw_system(1,yb-84)
c.setFont('SB',12.5); c.drawString(30,22+16,'Derecha: pulgar en Do4 (Do 1 Re 2 Mi 3 Fa 4 Sol 5); en el c. 12 se corre al La3 (La 1 Si 2 Do 3 Re 4 Mi 5).')
c.drawString(30,22,'Izquierda: pulgar en Do3 → Do 1 · La 3 · Sol 4 · Fa 5 (c. 9-14: dos teclas a la vez, el pulgar siempre en Do).')
c.save(); print('bottom',yb2)
