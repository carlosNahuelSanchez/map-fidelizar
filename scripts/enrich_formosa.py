#!/usr/bin/env python3
"""Apply sourced Formosa additions; keep aliases and excluded brands reproducible."""
from pathlib import Path
import json,re,sys
from concurrent.futures import ThreadPoolExecutor,as_completed
sys.path.insert(0,str(Path(__file__).parent))
from import_readme_locals import extract_image
ROOT=Path(__file__).resolve().parents[1]
MUNI_PAN='https://turismo.formosatuciudad.gob.ar/vivi/gastronomia/196-panaderias-pastelerias'
MUNI_HEL='https://turismo.formosatuciudad.gob.ar/vivi/gastronomia/194-heladerias'
NEAHOY='https://neahoy.com/2024/08/02/te-gusta-lo-dulce-te-traemos-3-emprendimientos-formosenos-que-no-te-podes-perder/'
EXA='https://exa.ai/library/place/'

def record(slug,name,niche,lat,lon,address,ig,source,phone=None,email=None,city='Formosa capital',website=None,brand=None,note=None):
 brand=brand or 'fsa-ig-'+ig
 d={'id':'fsa-research-'+slug,'name':name,'type':'panadería' if niche=='PAN' else 'heladería','niche':niche,'province':'Formosa','jurisdiction':city,'latitude':lat,'longitude':lon,'website':website,'instagram':'https://www.instagram.com/'+ig+'/' if ig else None,'contactType':'Local/ficha','exaStatus':'Fuente recuperada con Exa / OSM','sources':source if isinstance(source,list) else [source],'brandId':brand,'logo':None,'logoSource':'https://www.instagram.com/'+ig+'/' if ig else website,'phone':phone,'whatsapp':None,'email':email}
 if address:d['address']=address
 if note:d['locationNote']=note
 return d

def definitions():
 additions=[]
 # Same commercial identity, separate sourced physical branches. Never use a street centroid.
 casapan=[
  ('osm-9562601020',-26.1932553,-58.1981788,None,'https://www.openstreetmap.org/node/9562601020'),
  ('osm-1038263993',-26.1900779,-58.1884118,None,'https://www.openstreetmap.org/way/1038263993'),
  ('osm-1038266590',-26.1804526,-58.1738259,None,'https://www.openstreetmap.org/way/1038266590'),
  ('lelong',-26.177256,-58.179594,'Av. González Lelong 1045',EXA+'tzxyq14yx8l'),
  ('norte',-26.131786,-58.159926,None,EXA+'slb65y8hqfb'),
  ('departamento',-26.144298,-58.158149,None,EXA+'zgwbf9mk7dc'),
 ]
 for slug,lat,lon,address,source in casapan:
  d=record('pandecasa-'+slug,'Pan de Casa','PAN',lat,lon,address,'pandecasafsa',[source,'https://pandecasa.com.ar/contacto-2',MUNI_PAN],phone='+543704679344',email='contacto@pandecasa.com.ar',website='https://pandecasa.com.ar/',brand='site-pandecasa-com-ar',note='Nombre histórico Casa Pan / CasaPan. '+('Punto OSM; domicilio de esta sucursal sin altura publicada.' if slug.startswith('osm-') else 'Ubicación de ficha cartográfica; el contacto es de la marca.'))
  d['contactType']='Marca compartida';additions.append(d)
 additions += [
  record('180-grados','180 Grados Pastelería Artesanal','PAN',-26.13064,-58.16379,'Bº 7 de Mayo, Mz. 3, casa 5','180_pasteleriaartesanal',EXA+'9h9vhmytjqc',phone='+543704787285',email='180pasteleria@gmail.com'),
  record('dulce-bocado','Dulce Bocado Formosa','PAN',-26.157303,-58.178947,'Av. Dr. Laureano Maradona 441','dulce_bocado_fsa',EXA+'bzmt0qhyy9k',phone='+543704564427'),
  record('oh-la-la','Oh La La Pastelería','PAN',-26.191812,-58.17298,'Ayacucho 985','ohlalapasteleria_',[EXA+'jt4nwm1w9b4',MUNI_PAN],phone='+543704679344'),
  record('miel-y-canela','Miel y Canela Pastelería','PAN',-26.182612,-58.169994,'España 484','mielycanela.pasteleria',[EXA+'18h7slr1krr',MUNI_PAN],phone='+543704250340',email='mielycanela.pasteleria19@gmail.com',note='La ficha cartográfica indica España 484; el directorio municipal publica España 424. Confirmar altura con el local.'),
  record('dulce-tradicion','Dulce Tradición','PAN',-26.18716,-58.19393,'Azopardo 435','dulcetradicion.fsa','https://exa.ai/library/places?q=c2d400dcd0e52eab',phone='+5493704232580'),
  record('dulce-fantasia','Dulce Fantasía','PAN',-26.184937,-58.20833,'Coronel Bogado 3737','dulce.fantasiafm',EXA+'zr64trlz11g',phone='+543704680945'),
  record('frola','Fröla · Panadería Salvaje','PAN',-26.185812,-58.168301,'Brandsen 470','frolapanaderiasalvaje',[EXA+'w1jt2sfqpdh',NEAHOY],phone='+543705235234',email='frolamicropanaderia@gmail.com',note='La ficha consultada ubica Brandsen 470; una publicación de 2024 menciona Rivadavia 1058. Confirmar el domicilio vigente.'),
  record('maru','Maru Pastelería','PAN',-26.197734,-58.177849,'Ausberto Ortiz 1555','maru_pasteleria',EXA+'w56clsfjw39'),
  record('arte-tortas','Arte Tortas Formosa','PAN',-26.204439,-58.1986,'Pueyrredón 1750','arte_tortasformosa',EXA+'j1nw1p2sphb',phone='+543704265414',note='La ficha posee categorías mixtas; se conserva su rubro de pastelería y perfil comercial publicado.'),
  record('polijub-italia','Polijub Helados','HEL',-26.17545,-58.19108,'Av. Italia 1616 / Vicente Posadas','polijubheladosfsa',['https://exa.ai/library/places?q=0cfae518e33cffdf',MUNI_HEL],phone='+543704701487',note='Se unificaron las fichas de Italia 1616 y Vicente Posadas 1860 separadas por menos de 10 m.'),
  record('polijub-rivadavia','Polijub Helados','HEL',-26.174494,-58.169725,'Rivadavia 1','polijubheladosfsa',[EXA+'3rx7p4k6045',MUNI_HEL],phone='+543704701487'),
  record('polijub-italia-3178','Polijub Helados','HEL',-26.175922,-58.204928,'Av. Italia 3178','polijubheladosfsa',[EXA+'0s60x20g95s',MUNI_HEL],phone='+543704701487'),
  record('polijub-c5','Polijub Helados C5','HEL',-26.131521,-58.175744,'Antenor Polo Este','polijubheladosfsa',[EXA+'1sv1fjny79s',MUNI_HEL],phone='+543704701487'),
  record('polijub-clorinda','Polijub Helados','HEL',-25.286863,-57.712089,'Av. San Martín 541','heladospolijub',EXA+'kxxbfvn693l',phone='+543718493390',city='Clorinda'),
  record('capricho-colorado','Heladería Capricho · El Molino Café-Bar','HEL',-26.30980,-59.37106,None,'heladeria_capricho_1','https://exa.ai/library/places?q=da799b2b6f27f63c',phone='+543704703307',city='El Colorado'),
  record('baldomero','Baldomero Helados','HEL',-26.184546,-58.162161,'Costanera de Formosa','baldomerofsa',[EXA+'9h893yhf2tk','https://godiamo.com.ar/bares/baldomero-resto-bar/',MUNI_HEL],phone='+543704440688',note='Perfil de la marca compartido con su resto/bar.'),
  record('fan-de-lo-dulce','Fan de lo Dulce','PAN',-26.3121938,-59.3696692,'España 472, casi San Juan','fandelodulce.ok',[NEAHOY,'https://maps.google.com/maps?q=Calle+Espa%C3%B1a+472+El+Colorado+Formosa&z=18&output=embed'],city='El Colorado',note='Dirección publicada por NEA HOY: España 472, casi San Juan. Google Maps resuelve la dirección completa España 472, P3603 El Colorado; punto obtenido por dirección, sin confirmar atención actual del negocio.'),
  record('luigi-gutnisky','Luigi · Gutnisky','HEL',-26.1903421,-58.1890047,'Av. Dr. Luis Gutnisky 2176','luigi_fsa',[MUNI_HEL,'https://www.sucursales24.com.ar/formosa/luigi-heladeria/av-dr-luis-gutniski-2176-3/'],phone='+543704944050',brand='ig-luigi-fsa',note='Coordenadas del mapa y GeoCoordinates de Sucursales24 para Gutniski 2176; domicilio y contacto publicados por el directorio municipal.'),
  record('polijub-guemes','Polijub Helados · Güemes','HEL',-26.180365,-58.1904295,'Silvestre Güemes 45','polijubheladosfsa',[MUNI_HEL,'https://www.sucursales24.com.ar/formosa/punto-pickit/silvestre-gemes-45-8/'],phone='+543704701487',note='Coordenadas de la ficha Punto Pickit para Silvestre Güemes 45. El directorio municipal vincula Polijub a este domicilio; la ficha cartográfica tiene otro nombre comercial.'),
 ]
 for d in additions:
  if d['brandId']=='site-pandecasa-com-ar':d['logo']='/logos/site-pandecasa-com-ar.png'
  if d['brandId']=='ig-luigi-fsa':d['logo']='/logos/ig-luigi-fsa.jpg'
  if d['name'].startswith('Polijub') and d['jurisdiction']=='Formosa capital':d['contactType']='Marca compartida'
 updates={
  'loc-001':{'address':'Av. 25 de Mayo 685','phone':'+543704532392','contactType':'Local/ficha'},
  'loc-003':{'address':'Saavedra 655','phone':'+543704589253'},
  'loc-004':{'address':'Saavedra 1099','phone':'+543704432000','contactType':'Local/ficha'},
  'loc-005':{'phone':'+543704843570','contactType':'Local/ficha'},
  'loc-008':{'address':'9 de Julio 1405','phone':'+543704627576','contactType':'Local/ficha'},
  'loc-pending-formosa-pandecasa':{'name':'Pan de Casa · planta', 'latitude':-26.1879784, 'longitude':-58.2108017, 'sources':['https://pandecasa.com.ar/contacto-2','https://maps.google.com/maps?q=Avenida+Doctor+Nestor+Kirchner+4066%2C+Formosa%2C+Formosa+Province&z=18&output=embed'],'address':'Av. Dr. Néstor Kirchner 4066','phone':'+543704679344','email':'contacto@pandecasa.com.ar','contactType':'Marca compartida','locationNote':'Planta / domicilio de la marca. El mapa embebido del sitio oficial resuelve Av. Dr. Néstor Kirchner 4066 en Formosa capital; no corresponde a una sucursal adicional confirmada.'},
 }
 return additions,updates

def merge_enrichment(records):
 path=ROOT/'RESEARCH/data/formosa-research.json'
 if not path.exists():return [x for x in records if not is_grido(x)]
 enrichment=json.loads(path.read_text())
 records=[x for x in records if not is_grido(x) and not x['id'].startswith('fsa-research-')]
 for item in records:
  if item['id'] in enrichment['updates']:item.update(enrichment['updates'][item['id']])
  if item['province']=='Formosa' and item['jurisdiction']=='Formosa':item['jurisdiction']='Formosa capital'
  if item['province']=='Formosa' and MUNI_HEL not in item['sources'] and item['niche']=='HEL':item['sources'].append(MUNI_HEL)
  if item['id']=='loc-003' and MUNI_PAN not in item['sources']:item['sources'].append(MUNI_PAN)
 records.extend(enrichment['businesses'])
 return records

def is_grido(record):return re.search('grido',' '.join(str(record.get(k) or '') for k in ['name','brandId','website','instagram']),re.I) is not None

def main():
 additions,updates=definitions()
 logos=json.loads((ROOT/'RESEARCH/data/logo-sources.json').read_text())
 requests={d['brandId']:d['logoSource'] for d in additions if d['logoSource'] and not d['logo'] and not logos.get(d['brandId'],{}).get('file')}
 print('Extracting brand marks:',len(requests),flush=True)
 with ThreadPoolExecutor(max_workers=8) as pool:
  futures={pool.submit(extract_image,url):(key,url) for key,url in requests.items()}
  for future in as_completed(futures):
   key,url=futures[future]
   try:result=future.result()
   except Exception:result=None
   if result:
    image,ctype,source=result
    ext='png' if 'png' in ctype else 'webp' if 'webp' in ctype else 'svg' if 'svg' in ctype else 'jpg'
    rel='/logos/'+key+'.'+ext;(ROOT/'public'/rel.lstrip('/')).write_bytes(image)
    logos[key]={'file':rel,'source':url,'imageSource':source,'kind':'exa-researched-official-profile'}
   else:logos[key]={'file':None,'source':url,'kind':'unavailable'}
 for d in additions:
  if logos.get(d['brandId'],{}).get('file'):d['logo']=logos[d['brandId']]['file']
 assert all(d['website'] or d['instagram'] for d in additions)
 output={'researchedAt':'2026-10-06','method':'Exa multi-pass source research and OSM Overpass AR-P; mandatory official IG or website; no Grido. Sources retain direct contact provenance.','businesses':additions,'updates':updates,'rejectedNotes':['Foreign Formosa Brazil social profiles rejected.','Nominatim Kirchner 4066 resolved streets in El Colorado/Ibarreta rather than an exact Formosa city house; not used.','Fan de lo Dulce address search returned street only; not mapped to street centroid.','Saboratto and old Guapaletas location have closure/move evidence; not added as confirmed active pins.','Facebook-only entries are excluded.','Central Pan de Casa Exa point shares coordinates with Rejis Pastelería and no height; not added as a seventh verified branch.']}
 (ROOT/'RESEARCH/data/formosa-research.json').write_text(json.dumps(output,ensure_ascii=False,indent=2)+'\n')
 (ROOT/'RESEARCH/data/logo-sources.json').write_text(json.dumps(logos,ensure_ascii=False,indent=2)+'\n')
 p=ROOT/'public/data/locations.json';data=json.loads(p.read_text());before=len(data['businesses'])
 data['businesses']=merge_enrichment(data['businesses'])
 data['countGeolocated']=sum(d['latitude'] is not None and d['longitude'] is not None for d in data['businesses'])
 data['countWithoutCoordinates']=len(data['businesses'])-data['countGeolocated']
 data['logoCount']=len({d['brandId'] for d in data['businesses'] if d['logo']})
 p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
 print('Before:',before,'After:',len(data['businesses']),'Formosa:',sum(d['province']=='Formosa' for d in data['businesses']),'Geolocated:',data['countGeolocated'],'Pending:',data['countWithoutCoordinates'],flush=True)

if __name__=='__main__':main()
