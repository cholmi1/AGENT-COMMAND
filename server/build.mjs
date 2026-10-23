import { readdir, mkdir, readFile, writeFile, rm, lstat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, extname } from 'node:path';
const root = fileURLToPath(new URL('../',import.meta.url));
const output = join(root,'public');
const roots = ['index.html','404.html','tools','privacy','styles','js'];
const extensions = new Set(['.html','.css','.js','.svg','.png','.jpg','.jpeg','.webp','.ico','.woff2']);
await rm(output,{recursive:true,force:true});
await mkdir(output,{recursive:true});
let files=0;
async function copy(relative) {
  const source = join(root,relative), stat = await lstat(source);
  if (stat.isSymbolicLink()) throw new Error('Symlinks are not allowed in public assets');
  if (stat.isDirectory()) {
    await mkdir(join(output,relative),{recursive:true});
    for (const entry of await readdir(source)) if (!entry.startsWith('.') && entry !== 'node_modules') await copy(join(relative,entry));
  } else if (stat.isFile() && extensions.has(extname(relative).toLowerCase())) {
    await writeFile(join(output,relative),await readFile(source)); files++;
  }
}
for (const relative of roots) await copy(relative);
console.log('Staged '+files+' public static assets; source, docs and secrets excluded.');
