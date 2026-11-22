// Tiny stack VM: exact ISA v1 implementation (kit ISA.md; reference vm.mjs rules).
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
function run(p, q) {
const n = p.length;
const D = new Int32Array(256);
const C = new Int32Array(64);
const M = new Int32Array(256);
const o = new Uint8Array(65536);
let sp = 0, cp = 0, ol = 0, ip = 0, pc = 0, st = 0;
const end = (c) => ({ o: o.subarray(0, ol), c });
for (;;) {
if (st === 1000000) return end(10);
if (pc < 0 || pc >= n) return end(9);
const op = p[pc];
const im = op === 1 ? 1 : op === 2 ? 4 : op >= 48 && op <= 51 ? 2 : 0;
if (pc + im >= n) return end(9);
st++;
const nx = pc + 1 + im;
pc = nx;
switch (op) {
case 0x00:
return end(0);
case 0x01:
if (sp >= 256) return end(3);
D[sp++] = (p[nx - 1] << 24) >> 24;
break;
case 0x02:
if (sp >= 256) return end(3);
D[sp++] = p[nx - 4] | (p[nx - 3] << 8) | (p[nx - 2] << 16) | (p[nx - 1] << 24);
break;
case 0x03:
if (sp < 1) return end(2);
sp--;
break;
case 0x04:
if (sp < 1) return end(2);
if (sp >= 256) return end(3);
D[sp] = D[sp - 1];
sp++;
break;
case 0x05: {
if (sp < 2) return end(2);
const t = D[sp - 1];
D[sp - 1] = D[sp - 2];
D[sp - 2] = t;
break;
}
case 0x06:
if (sp < 2) return end(2);
if (sp >= 256) return end(3);
D[sp] = D[sp - 2];
sp++;
break;
case 0x07: {
if (sp < 3) return end(2);
const a = D[sp - 3];
D[sp - 3] = D[sp - 2];
D[sp - 2] = D[sp - 1];
D[sp - 1] = a;
break;
}
case 0x17:
if (sp < 1) return end(2);
D[sp - 1] = -D[sp - 1] | 0;
break;
case 0x1b:
if (sp < 1) return end(2);
D[sp - 1] = ~D[sp - 1];
break;
case 0x10: case 0x11: case 0x12: case 0x13: case 0x14: case 0x15: case 0x16:
case 0x18: case 0x19: case 0x1a: case 0x1c: case 0x1d: case 0x1e:
case 0x20: case 0x21: case 0x22: {
if (sp < 2) return end(2);
const b = D[sp - 1], a = D[sp - 2];
let r;
if (op === 0x10) r = (a + b) | 0;
else if (op === 0x11) r = (a - b) | 0;
else if (op === 0x12) r = Math.imul(a, b);
else if (op === 0x13) { if (b === 0) return end(4); r = (a / b) | 0; }
else if (op === 0x14) { if (b === 0) return end(4); r = (a % b) | 0; }
else if (op === 0x15) { if (b === 0) return end(4); r = Math.floor((a >>> 0) / (b >>> 0)) | 0; }
else if (op === 0x16) { if (b === 0) return end(4); r = ((a >>> 0) % (b >>> 0)) | 0; }
else if (op === 0x18) r = a & b;
else if (op === 0x19) r = a | b;
else if (op === 0x1a) r = a ^ b;
else if (op === 0x1c) r = a << (b & 31);
else if (op === 0x1d) r = a >> (b & 31);
else if (op === 0x1e) r = (a >>> (b & 31)) | 0;
else if (op === 0x20) r = a === b ? 1 : 0;
else if (op === 0x21) r = a < b ? 1 : 0;
else r = (a >>> 0) < (b >>> 0) ? 1 : 0;
sp -= 2;
D[sp++] = r;
break;
}
case 0x30: case 0x31: case 0x32: {
const rel = ((p[nx - 2] | (p[nx - 1] << 8)) << 16) >> 16;
if (op === 0x30) { pc = nx + rel; break; }
if (sp < 1) return end(2);
const v = D[--sp];
if ((op === 0x31) === (v === 0)) pc = nx + rel;
break;
}
case 0x33:
if (cp === 64) return end(7);
C[cp++] = nx;
pc = p[nx - 2] | (p[nx - 1] << 8);
break;
case 0x34:
if (cp === 0) return end(8);
pc = C[--cp];
break;
case 0x40: {
if (sp < 1) return end(2);
const addr = D[sp - 1];
if (addr < 0 || addr > 255) return end(6);
D[sp - 1] = M[addr];
break;
}
case 0x41: {
if (sp < 2) return end(2);
const addr = D[sp - 1], v = D[sp - 2];
if (addr < 0 || addr > 255) return end(6);
sp -= 2;
M[addr] = v;
break;
}
case 0x50: {
if (sp < 1) return end(2);
const s = '' + D[sp - 1];
if (ol + s.length > 65536) return end(11);
sp--;
for (let i = 0; i < s.length; i++) o[ol++] = s.charCodeAt(i);
break;
}
case 0x51:
if (sp < 1) return end(2);
if (ol + 1 > 65536) return end(11);
o[ol++] = D[--sp] & 255;
break;
case 0x52:
if (sp >= 256) return end(3);
D[sp++] = ip < q.length ? q[ip++] : -1;
break;
case 0x53:
if (sp < 1) return end(2);
return end(D[--sp] & 255);
default:
return end(5);
}
}
}
const I = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const O = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
for (const id of readdirSync(I).sort()) {
const r = run(new Uint8Array(readFileSync(join(I, id, 'program.bin'))), new Uint8Array(readFileSync(join(I, id, 'input.bin'))));
mkdirSync(join(O, id), { recursive: true });
writeFileSync(join(O, id, 'stdout.bin'), r.o);
writeFileSync(join(O, id, 'exit.txt'), r.c + '\n');
}
