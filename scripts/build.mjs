import {readdir,readFile,rm,mkdir,cp,stat} from 'node:fs/promises';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const root=process.cwd(),dist=path.join(root,'dist');
async function walk(dir){return(await Promise.all((await readdir(dir,{withFileTypes:true})).map(async d=>d.isDirectory()?walk(path.join(dir,d.name)):[path.join(dir,d.name)]))).flat();}
for(const file of await walk(path.join(root,'src'))){if(!file.endsWith('.js'))continue;const result=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});if(result.status)throw new Error(result.stderr);const text=await readFile(file,'utf8');for(const m of text.matchAll(/(?:from\s*|import\s*)['"](\.[^'"]+)['"]/g))await stat(path.resolve(path.dirname(file),m[1]));}
const html=await readFile('index.html','utf8');
for(const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)){const url=match[1];if(/^(?:https?:|\.\.\/)/.test(url))continue;await stat(path.resolve(root,url.split('?')[0]));}
const manifest=JSON.parse(await readFile('manifest.webmanifest','utf8'));for(const icon of manifest.icons)await stat(path.resolve(root,icon.src));
if(path.basename(root)==='ChordsTabs'){
 const {validateSong}=await import('../src/song-format.js');const catalog=JSON.parse(await readFile('data/catalog.json','utf8'));const ids=new Set();
 for(const entry of catalog){if(ids.has(entry.id))throw new Error('Duplicate catalog entry');ids.add(entry.id);const song=validateSong(JSON.parse(await readFile('data/'+entry.file,'utf8')));if(song.id!==entry.id)throw new Error('Mismatched song ID');}
}
await rm(dist,{recursive:true,force:true});await mkdir(dist,{recursive:true});
for(const name of ['index.html','styles.css','manifest.webmanifest','src','assets','data']){try{await stat(name);}catch{continue;}await cp(name,path.join(dist,name),{recursive:true});}
console.log('Validated scripts, imports, assets, manifest, and song data. Static site built in dist/.');
