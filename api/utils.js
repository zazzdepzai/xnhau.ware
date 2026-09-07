// utils for serverless API
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

function tok() { return crypto.randomBytes(24).toString('base64url'); }
function nowISO(){ return new Date().toISOString(); }

function parseCookies(req) {
  const header = req.headers.cookie || '';
  const obj = {};
  header.split(';').forEach(pair=>{const [k,v]=pair.split('='); if(k && v) obj[k.trim()]=decodeURIComponent(v.trim());});
  return obj;
}

function setCookie(res, name, value, opts={}){
  // opts: maxAge in seconds, httpOnly, path, sameSite, secure
  let str = `${name}=${encodeURIComponent(value)}`;
  if (opts.maxAge) str += `; Max-Age=${opts.maxAge}`;
  if (opts.httpOnly) str += `; HttpOnly`;
  if (opts.path) str += `; Path=${opts.path}`; else str += `; Path=/`;
  if (opts.sameSite) str += `; SameSite=${opts.sameSite}`;
  if (opts.secure) str += `; Secure`;
  // multiple Set-Cookie headers
  const prev = res.getHeader('Set-Cookie');
  if (!prev) res.setHeader('Set-Cookie', str);
  else if (Array.isArray(prev)) res.setHeader('Set-Cookie', prev.concat(str));
  else res.setHeader('Set-Cookie', [prev, str]);
}

module.exports = { tok, nowISO, parseCookies, setCookie, bcrypt };
