import fs from 'node:fs/promises';import sharp from 'sharp';
const sources={archer:'https://media.ffycdn.net/eu/supercell/MZekS2R5DpmwTYzGbZaH.png?width=1000',wizard:'https://media.ffycdn.net/eu/supercell/h5aMtfzeaACgyQTgFiXu.png?width=1000',bomber:'https://media.ffycdn.net/eu/supercell/FrXjjdGDsBoLXy1nRxqf.png?width=1000',ice:'https://media.ffycdn.net/eu/supercell/BMqPE5eBF5Knm54Vxfsq.png?width=1000',tree:'https://media.ffycdn.net/eu/supercell/Ny9jpcntQiJYLLeDTsWW.png?width=800',rock:'https://media.ffycdn.net/eu/supercell/SeEQNfznTabkAFDUntgZ.png?width=800'};
await fs.mkdir('public/assets',{recursive:true});
for(const [name,url] of Object.entries(sources)){const res=await fetch(url);if(!res.ok)throw Error(`${name}: HTTP ${res.status}`);const buffer=Buffer.from(await res.arrayBuffer());await sharp(buffer).trim().resize({width:560,height:600,fit:'inside',withoutEnlargement:true}).webp({quality:86}).toFile(`public/assets/${name}.webp`);await sharp(buffer).trim().resize({width:100,height:110,fit:'inside'}).webp({quality:85}).toFile(`public/assets/${name}-sprite.webp`);console.log(name,'saved');}
await fs.writeFile('public/assets/sources.json',JSON.stringify(sources,null,2));

