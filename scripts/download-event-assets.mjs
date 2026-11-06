import fs from 'node:fs/promises';
import sharp from 'sharp';
const assets = {
  oak:'fRmfjcw6PgM1SapiRnq3', sapling:'vnYoww4RhvQm8Up99vra',
  musketeer:'Yps27pfXEgEYaUK42ppf', dart:'RZbFSnwbboQ5DUAzKTPW', princess:'Akr23pvrQr9QoaQktso5',
  haste:'GzBUAtgiCazF5zEzhhqc', heal:'k9h7UPbJBL8EppvTbvUT', rapid:'FM8DRbDKjA8iBYmqSjqg',
  wall:'kbjgfzsUnokA2p2RYpru', ruin:'4oiVgFpBfGMoSU5Z9pSR',
  bush:'icQ7DNU8B5rG5dpXwydk', pond:'k1N14cjQnPPfXgpBDy12',
  water:'BbNN5Azg3E1W4HW3VEqw', stump:'YwTyEcAnADS6jCcd5QjX',
  grove:'1BCwEbfVcJuvQWZhA92Z', gems:'rc3TvYvvLC8Vbry3tyQW',
};
const manifest=JSON.parse(await fs.readFile('public/assets/sources.json','utf8'));
for(const [name,key] of Object.entries(assets)) {
 const url=`https://media.ffycdn.net/eu/supercell/${key}.png?width=800`;
 const res=await fetch(url); if(!res.ok)throw Error(`${name}: ${res.status}`);
 const buffer=Buffer.from(await res.arrayBuffer());
 await sharp(buffer).trim().resize({width:560,height:600,fit:'inside',withoutEnlargement:true}).webp({quality:88}).toFile(`public/assets/${name}.webp`);
 await sharp(buffer).trim().resize({width:150,height:160,fit:'inside'}).webp({quality:88}).toFile(`public/assets/${name}-sprite.webp`);
 manifest[name]=url; console.log(name);
}
await fs.writeFile('public/assets/sources.json',JSON.stringify(manifest,null,2));
