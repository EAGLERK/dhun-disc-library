// @ts-nocheck
// Ported verbatim from the Dhun site (index.html): catalogue, cover art, disc art.
/* ───────── helpers ───────── */
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const smooth=t=>t*t*(3-2*t);
const RAD=Math.PI/180, DEG=180/Math.PI;
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
function rng32(seed){let a=seed>>>0;return()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function hashStr(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function hs(seed,b,s){let h=Math.imul((seed^Math.imul(b+1,374761393)^Math.imul(s+1,668265263))|0,2246822519);h^=h>>>13;h=Math.imul(h,3266489917);return(h^h>>>16)>>>0}
const fmt=sec=>{sec=Math.max(0,Math.floor(sec));return Math.floor(sec/60)+":"+String(sec%60).padStart(2,"0")};

/* ───────── catalogue (invented albums) ───────── */
const GENRES=["Ambient","Jazz","Electronic","Rock","Folk","Pop"];
const GSHORT=["Amb","Jazz","Elec","Rock","Folk","Pop"];
const LANGS=[["en","English"],["hi","Hindi"],["ta","Tamil"],["es","Spanish"],["ja","Japanese"]];
const Y0=1995,Y1=2024,SPAN=Y1-Y0+1;
const RAW={
en:[[["Low Cloud Atlas","Harbour Lights Ensemble"],["Rooms Without Clocks","Ines Varga"],["Slow Weather","Pale Meridian"],["Tidewater Tapes","North Annex"]],
    [["Blue Hour Ledger","Eddie Marlowe Trio"],["Corner Table","Lena Okafor Quartet"],["After the Matinee","Wendell Price Five"],["Small Hours, Big Rooms","June Halloran"]],
    [["Parallel Parking","Kite Machine"],["Night Shift Geometry","VCTR"],["Soft Reset","Mono Arcade"],["Glass Elevator","Ada Loop"]],
    [["Borrowed Amplifiers","The Spare Keys"],["Motel Constellations","Dust Parade"],["Last Train Loud","Hollow Coast"],["Paper Crowns","The Night Clerks"]],
    [["Kettle & Kin","Mara Fenwick"],["Orchard Letters","The Low Fences"],["Salt on the Sill","Tobias Reed"],["Field Notes for June","Wren & Harrow"]],
    [["Summer in Lowercase","Poppy Arden"],["Neon Postcards","Juno Vale"],["Good Luck Charm","The Sundays Off"],["Call Me When It Rains","Milo Kade"]]],
hi:[[["Subah Ki Dhund","Aarav Sen"],["Khamosh Nadi","Saaz Collective"],["Baadalon Ke Paar","Ira Mathur"],["Neend Ka Shehar","Meghdoot"]],
    [["Raat Ki Rail","Bandra Brass Quartet"],["Chai Aur Saxophone","Kabir D'Souza Trio"],["Purani Gali","Zoya Merchant"],["Dheemi Baarish","Colaba Five"]],
    [["Bijli","Taar"],["Raat Rani","Neon Nagar"],["Tez Raftaar","Circuit Wala"],["Chamak","Laal Batti"]],
    [["Aandhi","Sadak Chhaap"],["Bagawat","Kaala Dhuaan"],["Shor","Teen Taal Riot"],["Awaara Sadkein","Highway 44"]],
    [["Mitti Ke Geet","Lakshmi Rathore"],["Gaon Ki Shaam","Kachnar"],["Peepal Ki Chhaon","Devika & Rajan"],["Nadi Kinare","Banjara Dil"]],
    [["Dil Ka Radio","Tara Kapoor"],["Pehli Baarish","Anaya"],["Meethi Si Baat","Rhea & The Reels"],["Chandni Chowk Disco","Bunty Beats"]]],
ta:[[["Panithuli","Nila Collective"],["Megam","Aadhavan"],["Vidiyal","Kaveri Drift"],["Mounam","Ilan Thiru"]],
    [["Marina Iravu","Mylapore Quartet"],["Filter Kaapi Blues","The Adyar Five"],["Mazhai Neram","Anjali Raghavan Trio"],["Kadarkarai Saalai","Senthil & The Brass"]],
    [["Minnal","Kanavu Machine"],["Iravu Nagaram","Vinmeen"],["Minsaaram","Madras Modular"],["Vegam","Zha"]],
    [["Puyal","Erimalai"],["Sattham","North Madras Riot"],["Theeppori","Kaattu Poonai"],["Nedunchaalai","Route 45"]],
    [["Mann Vaasam","Thangam Mariappan"],["Oonjal","Vaigai Sisters"],["Kuruvi Koodu","Pechi & Murugan"],["Thinnai","Karisal Kuzhu"]],
    [["Vaanavil","Yazhini"],["Kadhal Radio","Dhruv & Diya"],["Chella Kutty","Sweet Kaaram"],["Malligai Poo","Meera Sundar"]]],
es:[[["La Hora Azul","Niebla Baja"],["Mapas de Lluvia","Irene Solano"],["Luz de Invierno","Costa Lenta"],["Sueño de Sal","Mar Adentro"]],
    [["Humo y Terciopelo","Cuarteto Malasaña"],["Medianoche en Lavapiés","Trío Aguirre"],["El Último Tranvía","Lucía Montero"],["Azul Casi Negro","Los Madrugadores"]],
    [["Circuito Cerrado","Pulso"],["Ciudad de Neón","Vértice"],["Frecuencia Modulada","Radio Júpiter"],["Bajo Voltaje","Lima Lima"]],
    [["Ruido Blanco","Los Fósforos"],["Carretera y Polvo","Perros del Sur"],["Sangre Nueva","La Tormenta"],["Garaje 27","Las Antenas"]],
    [["Cartas a Nadie","Elena del Río"],["Tierra Adentro","Hermanos Paredes"],["Canciones del Patio","Amparo Arce"],["Río Abajo","Los Arrieros del Alba"]],
    [["Verano Lento","Paula Rey"],["Besos de Papel","Nico Luna"],["Corazón Fluorescente","Las Golosinas"],["Dime Que Sí","Carla Vento"]]],
ja:[[["Komorebi","Mizuiro Ensemble"],["Yuki no Oto","Aoi Tanabe"],["Shizuka na Umi","Kumo"],["Asa no Kiri","Hoshizora Lab"]],
    [["Mayonaka no Kissaten","Shimokita Trio"],["Ame no Ginza","Haruko Mori Quartet"],["Saishuu Densha","Kenji Arai & Friends"],["Aoi Heya","The Yokohama Six"]],
    [["Denki Yume","Pixel Tanuki"],["Shinya Kousoku","Neon Koi"],["Hikari Machine","Sora Unit"],["Tokyo Loop Line","Yamanote Sound System"]],
    [["Kaminari","Akai Kutsu"],["Sakebi","The Tanukis"],["Yoake no Guitar","Hanabi Riot"],["Rojiura Rock","Kuroneko Garage"]],
    [["Kaze no Tegami","Nagisa Hayashi"],["Furusato no Yama","Tsugumi"],["Engawa","Mugi to Sora"],["Tanpopo no Michi","Hinata Mori"]],
    [["Natsu Soda","Momo Sakura"],["Kirakira Station","Luna Parfait"],["Suki Kamo","Hana & Yui"],["Yuuyake Melody","Citrus Club"]]]
};
const TRACKS={
en:["First Light","Paper Boats","Lantern Street","Two Windows","Half Past Quiet","Marigold","The Long Way Home","Static Bloom","Borrowed Time","Undertow","Sleepwalker's Map","Northbound","Ten Degrees","Glasshouse","Open Tuning","Signal Fire","Velvet Rope","Midnight Inventory","Small Change","Afterglow","Rooftop Season","Carousel","Tin Roof","Postscript","Slow Dissolve","Elevator Hum","Kite Weather","Blue Receipt","Last Call","Shoreline"],
hi:["Pehli Kiran","Kagaz Ki Naav","Gali Ka Mod","Do Khidkiyan","Aadhi Raat","Gulmohar","Ghar Ka Rasta","Dhoop Chhaon","Udhaar Ka Waqt","Lehrein","Sapnon Ka Naksha","Uttar Ki Ore","Sardi Ki Subah","Aaina","Khula Aasman","Jugnu","Makhmal","Chhutte Paise","Saanjh","Chhat Par","Jhoola","Bhanwar","Teen Ki Chhat","Chitthi","Dheere Dheere","Patang","Aakhri Local","Barsaat","Kinara","Subah Hone Tak"],
ta:["Mudhal Oli","Kaagidha Kappal","Theru Vilakku","Rendu Jannal","Nalliravu","Sevvanthi","Veettukku Vazhi","Veyil Nizhal","Alaigal","Kanavu Varaipadam","Vadakku Nokki","Margazhi Kaalai","Kannaadi","Thirandha Vaanam","Minminipoochi","Pattu","Sillarai","Anthi Maalai","Mottai Maadi","Raattinam","Suzhal","Thagara Koorai","Kaditham","Mella Mella","Pattam","Kadaisi Bus","Thooral","Karai","Vidiyum Varai","Nila Soru"],
es:["Primera Luz","Barcos de Papel","Calle del Farol","Dos Ventanas","Casi Medianoche","Caléndula","El Camino Largo","Sol y Sombra","Tiempo Prestado","Oleaje","Mapa del Sonámbulo","Rumbo Norte","Diez Grados","Invernadero","Cielo Abierto","Luciérnaga","Terciopelo","Monedas Sueltas","Atardecer","Azotea","Carrusel","Remolino","Techo de Lata","Posdata","Despacio","Cometa","Último Metro","Llovizna","Orilla","Hasta el Alba"],
ja:["Asa no Hikari","Kami no Fune","Gaitou","Futatsu no Mado","Mayonaka","Kinmokusei","Kaerimichi","Hinata to Kage","Karita Jikan","Sazanami","Yume no Chizu","Kita e","Fuyu no Asa","Kagami","Aozora","Hotaru","Birodo","Kozeni","Yuugure","Okujou","Kaiten Mokuba","Uzu","Totan Yane","Tsuishin","Yukkuri","Tako Age","Shuuden","Kirisame","Nagisa","Yoake Made"]
};
const BLURB={
Ambient:[["Tape loops left running overnight in an empty swimming hall.","Built from field recordings of a harbour before the ferries start.","Two synthesisers and a window left open to the rain.","Recorded in single takes between midnight and first light.","Assembled from a year of voice memos and one detuned piano."],
  ["Every piece arrives slowly and leaves the same way.","Nothing here hurries, and the low end stays warm throughout.","The melodies are small enough to miss on a first listen.","It sits behind a room the way weather sits behind a window.","Best played quietly, start to finish, without skipping."]],
Jazz:[["Cut live to two-track in a basement club after closing.","A small-group date with no charts, counted in and left alone.","Recorded over two evenings with the tape rolling between songs.","Originals written on a borrowed upright piano.","Brushes, a walking bass and an electric piano that is slightly out of tune."],
  ["The rhythm section never rushes, and the solos stay short.","You can hear chairs, glasses and the bassist counting off.","The ballads carry the record; the fast ones keep it honest.","It swings hardest when it plays quietest.","The second half is where the band stops being polite."]],
Electronic:[["Sequenced on a drum machine with three working pads.","Written on night buses and finished in a rented studio in four days.","A club record built from one synth, one sampler and a lot of patience.","Every track started as a loop that refused to end.","Hardware only, recorded straight to stereo with no edits."],
  ["The kick stays put while everything else drifts around it.","Arpeggios open up bar by bar until the room is full.","It works at low volume and gets better loud.","The bass lines do most of the talking.","Made for the last hour of the night, when the lights are low."]],
Rock:[["Tracked in a week in a garage with the door open.","Four people, two amplifiers and a drum kit held together with tape.","Written on tour and recorded the day the van came home.","Recorded loud in a rehearsal room the band was about to lose.","Ten days, one microphone on the room and no click track."],
  ["The choruses land early and the guitars never clean up.","Every song sounds one take away from falling apart.","The rhythm guitar is the lead instrument here.","It opens at full volume and only steps back once.","Short songs, long feedback, no ballad."]],
Folk:[["Recorded in a kitchen with one guitar and a borrowed microphone.","Songs collected over three harvests and sung in the order they were written.","Fingerpicked in open tuning, with the room left in the recording.","Made on a porch across one dry week in late summer.","Two voices, six strings and a floor that creaks in time."],
  ["The songs are plain on purpose and stay with you for it.","You hear every finger slide and every breath before a verse.","Nothing is doubled, nothing is fixed.","It sounds like a letter read aloud.","The quiet songs are the ones that carry furthest."]],
Pop:[["Written in a bedroom and finished in a proper studio with a proper budget.","Every hook was tested on friends before anyone pressed record.","Bright keys, handclaps and a bass line you can hum.","Made over one summer with the windows open.","A singles collection that happens to be a debut album."],
  ["Every chorus arrives before the first minute is out.","It is sweeter than it needs to be and knows it.","The verses are short so the hooks can come back sooner.","Three minutes a song, no filler between them.","Built for car stereos with the volume near the top."]]
};
const DUR={Ambient:[240,500],Jazz:[210,400],Electronic:[200,370],Rock:[170,285],Folk:[150,255],Pop:[165,235]};
const PALS=[
 {bg:"#2b3fd6",ink:"#ffffff",d:"#1b2a94",art:["#1d2aa0","#ffd23f","#ffffff","#ff7b54"]},
 {bg:"#7d1f2a",ink:"#f6e7d8",d:"#5c1420",art:["#932a38","#e9b872","#f6e7d8","#2b0f14"]},
 {bg:"#dcefe2",ink:"#1d3b2f",d:"#1d4a39",art:["#c3e3cf","#2f7d5b","#f4a259","#1d3b2f"]},
 {bg:"#141414",ink:"#f2f0ea",d:"#1a1a1a",art:["#1f1f1f","#ff5a36","#f2f0ea","#6b6b6b"]},
 {bg:"#f2b6cc",ink:"#5a1235",d:"#7a1e4a",art:["#f7cfdd","#d6457f","#fff4f8","#5a1235"]},
 {bg:"#2f6670",ink:"#eef7f4",d:"#1f4a52",art:["#bfe3dd","#2f6670","#f3e9d2","#17383f"]},
 {bg:"#e3b53c",ink:"#2c2206",d:"#5c4502",art:["#f0cc66","#c8501e","#2c2206","#fff3cf"]},
 {bg:"#3b2466",ink:"#ece4ff",d:"#3b2466",art:["#2a1850","#a78bfa","#f0abfc","#fde68a"]},
 {bg:"#f1eee6",ink:"#1b1b1b",d:"#22211e",art:["#e4dfd2","#1b1b1b","#d9482b","#8a8372"]},
 {bg:"#e8762c",ink:"#1f1206",d:"#7a3206",art:["#f39a55","#1f1206","#fff1e0","#7a2e0e"]},
 {bg:"#aebcf2",ink:"#131a4a",d:"#1e2a78",art:["#c9d3f8","#3b4cc0","#ffffff","#131a4a"]},
 {bg:"#18244a",ink:"#e8ecf7",d:"#18244a",art:["#0f1836","#f2c14e","#e8ecf7","#4f6bd6"]},
 {bg:"#d9412f",ink:"#fff1e6",d:"#8f2015",art:["#b93424","#ffd9a0","#fff1e6","#3a0d08"]},
 {bg:"#ecd9b8",ink:"#3b2a14",d:"#4a3416",art:["#f4e6cb","#c96f3b","#3b2a14","#7fa59a"]},
 {bg:"#1f4d3a",ink:"#eaf3e6",d:"#1f4d3a",art:["#173a2c","#9bd08a","#f3d36b","#eaf3e6"]},
 {bg:"#cdb7e9",ink:"#2b1747",d:"#3f2468",art:["#e0d2f3","#6b3fa0","#ffffff","#2b1747"]},
 {bg:"#8fd0e8",ink:"#0d3447",d:"#0d3f57",art:["#bfe6f3","#0d3447","#ff8a5b","#ffffff"]},
 {bg:"#3a3d42",ink:"#f0f0ee",d:"#2a2d31",art:["#2b2e32","#ffb36b","#f0f0ee","#8b9099"]}
];

/* cover art: programmatic SVG, one of eleven motifs, 300 x 192 art window */
const MOTIFS=[
 (r,[g,a,b,c])=>{const cx=150+(r()-.5)*70,cy=96+r()*18,R=58+r()*20;let s=`<circle cx="${cx}" cy="${cy}" r="${R}" fill="${a}"/>`;
   for(let i=0;i<6;i++)s+=`<rect x="0" y="${cy+6+i*13}" width="300" height="${2.5+i*1.7}" fill="${g}"/>`;
   s+=`<rect x="0" y="150" width="300" height="42" fill="${c}"/>`;for(let i=0;i<4;i++)s+=`<rect x="${20+r()*150}" y="${158+i*9}" width="${40+r()*90}" height="2" fill="${g}" opacity=".7"/>`;
   return s+`<circle cx="${40+r()*220}" cy="${22+r()*20}" r="5" fill="${b}"/>`},
 (r,[g,a,b,c])=>{let s="";for(let i=0;i<26;i++)s+=`<circle cx="${r()*300}" cy="${r()*192}" r="${.6+r()*1.2}" fill="${b}" opacity=".7"/>`;
   s+=`<g transform="rotate(${-18+r()*12} 150 96)">`;[[66,20],[102,33],[140,46]].forEach(([rx,ry],i)=>{s+=`<ellipse cx="150" cy="96" rx="${rx}" ry="${ry}" fill="none" stroke="${b}" stroke-width="1.4" stroke-dasharray="2 5" opacity=".9"/>`;
     const th=r()*6.28;s+=`<rect x="${150+rx*Math.cos(th)-7}" y="${96+ry*Math.sin(th)-4}" width="14" height="8" rx="1.5" fill="${i%2?c:a}"/>`});
   return s+`</g><circle cx="150" cy="96" r="${26+r()*8}" fill="${a}"/>`},
 (r,[g,a,b,c])=>{const cx=50+r()*200,cy=40+r()*112;let s="";for(let i=10;i>=1;i--)s+=`<circle cx="${cx}" cy="${cy}" r="${i*21}" fill="none" stroke="${i%3===0?a:b}" stroke-width="${i%2?1.6:5}" opacity="${i%3===0?1:.55}"/>`;
   return s+`<circle cx="${cx}" cy="${cy}" r="9" fill="${c}"/>`},
 (r,[g,a,b,c])=>{let s=`<circle cx="${200+r()*60}" cy="${40+r()*18}" r="${17+r()*7}" fill="${b}"/>`;const cols=[a,a,a,c],op=[.3,.55,.85,1];
   for(let L=0;L<4;L++){const base=80+L*27,amp=20-L*3,f1=.012+r()*.02,p1=r()*6,f2=.04+r()*.03,p2=r()*6;let d=`M0,192 L0,${base}`;
     for(let x=0;x<=300;x+=6)d+=` L${x},${(base+amp*Math.sin(x*f1+p1)+amp*.35*Math.sin(x*f2+p2)).toFixed(1)}`;s+=`<path d="${d} L300,192 Z" fill="${cols[L]}" opacity="${op[L]}"/>`}
   return s},
 (r,[g,a,b,c])=>{let s="";const cs=[a,b,c];for(let y=0;y<4;y++)for(let x=0;x<6;x++){const cx=25+x*50,cy=24+y*48,col=cs[Math.floor(r()*3)];
     if(r()<.3)s+=`<circle cx="${cx}" cy="${cy}" r="15" fill="none" stroke="${col}" stroke-width="5"/>`;else{s+=`<circle cx="${cx}" cy="${cy}" r="18" fill="${col}"/>`;if(r()<.55)s+=`<circle cx="${cx}" cy="${cy}" r="7" fill="${g}"/>`}}
   return s},
 (r,[g,a,b,c])=>{let s=`<circle cx="${40+r()*220}" cy="${34+r()*14}" r="15" fill="${a}"/>`,x=-6;while(x<300){const w=20+r()*26,h=46+r()*104,dark=r()<.6;
     s+=`<rect x="${x}" y="${192-h}" width="${w}" height="${h}" fill="${dark?c:b}" opacity="${dark?1:.85}"/>`;
     for(let wy=192-h+8;wy<184;wy+=11)for(let wx=x+5;wx<x+w-6;wx+=8)if(r()<.34)s+=`<rect x="${wx}" y="${wy}" width="3.4" height="5" fill="${a}"/>`;x+=w+2}
   return s},
 (r,[g,a,b,c])=>{let s="";const cs=[a,b,c];for(let y=0;y<4;y++)for(let x=0;x<7;x++){const k=Math.floor(r()*4),dx=k&1?1:-1,dy=k&2?1:-1,cx=x*48+(dx>0?0:48),cy=y*48+(dy>0?0:48);
     s+=`<path d="M${cx},${cy} L${cx+dx*48},${cy} A48,48 0 0 ${dx*dy>0?1:0} ${cx},${cy+dy*48} Z" fill="${cs[Math.floor(r()*3)]}"/>`}
   return s},
 (r,[g,a,b,c])=>{const n=8+Math.floor(r()*7);let s="";for(let i=0;i<n;i++)s+=`<ellipse cx="150" cy="${96-40}" rx="${13+r()*5}" ry="46" transform="rotate(${i*360/n} 150 96)" fill="${i%2?a:b}" opacity=".78"/>`;
   return s+`<circle cx="150" cy="96" r="13" fill="${c}"/>`},
 (r,[g,a,b,c])=>{let s="";const n=22,ph=r()*3;for(let i=0;i<n;i++){const h=18+(.35+.65*Math.abs(Math.sin(i*.42+ph)))*(40+r()*100),x=10+i*12.9;
     s+=`<rect x="${x}" y="${174-h}" width="8" height="${h}" rx="4" fill="${i%5===2?b:a}"/>`}
   return s+`<rect x="10" y="180" width="280" height="2" fill="${c}"/>`},
 (r,[g,a,b,c])=>{let s="";const n=14;for(let i=0;i<n;i+=2){const t1=Math.PI*i/n,t2=Math.PI*(i+1)/n;
     s+=`<path d="M150,196 L${150+420*Math.cos(t1)},${196-420*Math.sin(t1)} L${150+420*Math.cos(t2)},${196-420*Math.sin(t2)} Z" fill="${a}" opacity=".9"/>`}
   return s+`<circle cx="150" cy="196" r="${48+r()*16}" fill="${c}"/><circle cx="150" cy="196" r="22" fill="${b}"/>`},
 (r,[g,a,b,c])=>{const cols=[a,b,c,a,b];let s="";for(let L=0;L<5;L++){const base=26+L*34,amp=9+r()*8,f=.02+r()*.025,p=r()*6;let d=`M0,192 L0,${base}`;
     for(let x=0;x<=300;x+=6)d+=` L${x},${(base+amp*Math.sin(x*f+p)).toFixed(1)}`;s+=`<path d="${d} L300,192 Z" fill="${cols[L]}" opacity="${L%2?.9:.75}"/>`}
   return s},
 (r,[g,a,b,c])=>{const fx=60+r()*180,fy=40+r()*110;let s=`<circle cx="${300-fx}" cy="${192-fy}" r="34" fill="${b}" opacity=".8"/>`;
   for(let y=0;y<10;y++)for(let x=0;x<16;x++){const cx=9.5+x*18.8,cy=9.6+y*19.2,dd=Math.hypot(cx-fx,cy-fy),rad=1+8*Math.max(0,1-dd/190);s+=`<circle cx="${cx}" cy="${cy}" r="${rad.toFixed(1)}" fill="${a}"/>`}
   return s}
];
function coverSVG(al){
  const P=al.pal,art=MOTIFS[al.motif](rng32(al.seed^0x51ed),P.art);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300"><rect width="300" height="300" fill="${P.bg}"/><svg x="0" y="66" width="300" height="192" viewBox="0 0 300 192"><rect width="300" height="192" fill="${P.art[0]}"/>${art}</svg></svg>`;
}

/* build the 120 albums */
const ALL=(()=>{
  const out=[];
  LANGS.forEach(([lc,ln])=>GENRES.forEach((g,gi)=>RAW[lc][gi].forEach(([title,artist])=>out.push({title,artist,lang:lc,langName:ln,genre:g,gi}))));
  const r=rng32(20261117);
  for(let i=out.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[out[i],out[j]]=[out[j],out[i]]}
  const perYear=out.length/SPAN, gk={};
  out.forEach((al,i)=>{
    al.year=Y0+Math.floor(i/perYear); al.t=al.year+((i%perYear)+.5)/perYear;
    al.id="a"+i; al.cat="DHN-"+String(i+1).padStart(3,"0"); al.seed=hashStr(al.title+al.artist);
    al.pal=PALS[(i*5+(i>>3))%PALS.length]; al.motif=(al.seed>>>3)%MOTIFS.length;
    const rr=rng32(al.seed),pool=TRACKS[al.lang].slice(),n=5+Math.floor(rr()*3),[d0,d1]=DUR[al.genre];
    al.tracks=[];
    for(let k=0;k<n;k++){const name=pool.splice(Math.floor(rr()*pool.length),1)[0];al.tracks.push({name,sec:Math.round(lerp(d0,d1,rr()))})}
    if(rr()<.55&&al.title.length<22)al.tracks[Math.floor(rr()*n)].name=al.title;
    al.mins=Math.round(al.tracks.reduce((s,t)=>s+t.sec,0)/60);
    const k=gk[al.genre]=(gk[al.genre]??-1)+1,[A,B]=BLURB[al.genre];
    al.blurb=A[k%5]+" "+B[(k+Math.floor(k/5))%5];
    al.coverUrl=`url('data:image/svg+xml,${encodeURIComponent(coverSVG(al)).replace(/'/g,"%27")}')`;
    const {bg,art}=al.pal; al.accent=[art[1],art[2],art[3]].find(c=>c.toLowerCase()!==bg.toLowerCase());
  });
  return out;
})();
const byId=new Map(ALL.map(a=>[a.id,a]));

const coverText=al=>`<div class="c-head"><span class="c-artist">${esc(al.artist)}</span><span class="c-cat">${al.cat}</span><b class="c-title${al.title.length>17?" long":""}">${esc(al.title)}</b></div>
<div class="c-foot"><span><i></i>DHUN</span><span>${al.year}</span></div>`;
let discUid=0;
function discHTML(al){
  const u="dp"+(++discUid),{bg,ink}=al.pal,txt=`${al.title} · ${al.artist} · ${al.cat} · ${al.year} · `.toUpperCase();
  return `<div class="disc"><div class="disc-print"><svg viewBox="0 0 200 200" aria-hidden="true">
<circle cx="100" cy="100" r="100" fill="${bg}"/>
<circle cx="100" cy="100" r="60" fill="none" stroke="${ink}" stroke-width=".8" opacity=".35"/>
<path d="M100,48 A52,52 0 0 1 150.2,86.5" fill="none" stroke="${al.accent}" stroke-width="11"/>
<circle cx="52" cy="118" r="5" fill="${al.accent}"/>
<path id="${u}a" d="M100,188 a88,88 0 1,1 0,-176 a88,88 0 1,1 0,176" fill="none"/>
<path id="${u}b" d="M100,170 a70,70 0 1,1 0,-140 a70,70 0 1,1 0,140" fill="none"/>
<text font-family="DM Mono,ui-monospace,monospace" font-size="6.4" letter-spacing="1.6" fill="${ink}" opacity=".85"><textPath href="#${u}a" textLength="540" lengthAdjust="spacing">${esc(txt)}</textPath></text>
<text font-family="Bricolage Grotesque,Instrument Sans,system-ui,sans-serif" font-size="${al.title.length>17?10.5:14}" font-weight="700" fill="${ink}" text-anchor="middle"><textPath href="#${u}b" startOffset="50%">${esc(al.title)}</textPath></text>
</svg></div><div class="disc-fx"></div><div class="disc-hub"></div></div>`;
}


export {ALL,byId,GENRES,LANGS,Y0,Y1,SPAN,coverText,discHTML,fmt,clamp,lerp,smooth,hs,rng32,esc};
