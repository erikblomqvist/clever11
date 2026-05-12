import{a as w,b as q,c as A}from"./Br6WnCt5.js";import"./DJcSnXV-.js";import{q as F,v as J,i as K,aJ as L,u as y,l as k,aF as x,aK as O,g as m,aL as u,az as P,p as D,a as E,c as G,f as H,s as M,r as Q,h as R,n as T}from"./C8yaILQu.js";import{e as U,i as V}from"./DpZCG7eA.js";import{e as X}from"./BoddIR5M.js";import{a as W}from"./-vlCFOkY.js";import{l as z,p as d}from"./CCFdE1Gp.js";function Y(n,e,t,i,r){var o;F&&J();var s=(o=e.$$slots)==null?void 0:o[t],a=!1;s===!0&&(s=e.children,a=!0),s===void 0||s(n,a?()=>i:i)}function Z(n=!1){const e=K,t=e.l.u;if(!t)return;let i=()=>u(e.s);if(n){let r=0,s={};const a=P(()=>{let o=!1;const l=e.s;for(const f in l)l[f]!==s[f]&&(s[f]=l[f],o=!0);return o&&r++,r});i=()=>m(a)}t.b.length&&L(()=>{N(e,i),x(t.b)}),y(()=>{const r=k(()=>t.m.map(O));return()=>{for(const s of r)typeof s=="function"&&s()}}),t.a.length&&y(()=>{N(e,i),x(t.a)})}function N(n,e){if(n.l.s)for(const t of n.l.s)m(t);e()}/**
 * @license lucide-svelte v0.487.0 - ISC
 *
 * ISC License
 * 
 * Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2022 as part of Feather (MIT). All other copyright (c) for Lucide are held by Lucide Contributors 2022.
 * 
 * Permission to use, copy, modify, and/or distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
 * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
 * ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
 * ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
 * OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 * 
 */const $={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor","stroke-width":2,"stroke-linecap":"round","stroke-linejoin":"round"};var ee=q("<svg><!><!></svg>");function fe(n,e){const t=z(e,["children","$$slots","$$events","$$legacy"]),i=z(t,["name","color","size","strokeWidth","absoluteStrokeWidth","iconNode"]);D(e,!1);let r=d(e,"name",8,void 0),s=d(e,"color",8,"currentColor"),a=d(e,"size",8,24),o=d(e,"strokeWidth",8,2),l=d(e,"absoluteStrokeWidth",8,!1),f=d(e,"iconNode",24,()=>[]);const C=(...h)=>h.filter((c,g,_)=>!!c&&_.indexOf(c)===g).join(" ");Z();var v=ee();W(v,(h,c)=>({...$,...i,width:a(),height:a(),stroke:s(),"stroke-width":h,class:c}),[()=>(u(l()),u(o()),u(a()),k(()=>l()?Number(o())*24/Number(a()):o())),()=>(u(r()),u(t),k(()=>C("lucide-icon","lucide",r()?`lucide-${r()}`:"",t.class)))]);var p=G(v);U(p,1,f,V,(h,c)=>{var g=R(()=>T(m(c),2));let _=()=>m(g)[0],j=()=>m(g)[1];var b=A(),B=H(b);X(B,_,!0,(I,te)=>{W(I,()=>({...j()}))}),w(h,b)});var S=M(p);Y(S,e,"default",{}),Q(v),w(n,v),E()}export{fe as I,Z as i,Y as s};
