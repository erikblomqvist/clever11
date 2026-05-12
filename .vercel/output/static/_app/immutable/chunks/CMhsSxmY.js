import{c as X,a as n,f as i}from"./Br6WnCt5.js";import"./DJcSnXV-.js";import{f as q,p as K,c as A,g as a,r as d,t as M,h as y,a as L}from"./C8yaILQu.js";import{I as O,s as Q}from"./DYlSNT1t.js";import{l as R,b as T,p as N,a as U,s as V}from"./CCFdE1Gp.js";import{d as W,a as Y}from"./CVkGVXMU.js";import{i as j}from"./b9wHxheh.js";import{e as C}from"./DpZCG7eA.js";import{c as Z}from"./DTBRn5xY.js";import{s as aa,b as ta}from"./-vlCFOkY.js";import{s as ea}from"./R3Nfka15.js";import{$ as sa}from"./G5ZOrAzm.js";import{g as ra}from"./mFhek1tp.js";function ka(p,e){const _=R(e,["children","$$slots","$$events","$$legacy"]);/**
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
 */const f=[["path",{d:"M18 6 6 18"}],["path",{d:"m6 6 12 12"}]];O(p,T({name:"x"},()=>_,{get iconNode(){return f},children:(v,k)=>{var m=X(),u=q(m);Q(u,e,"default",{}),n(v,m)},$$slots:{default:!0}}))}var oa=i('<span class="seat-map__avatar svelte-nwoktd"><!></span>'),na=i('<span class="seat-map__stack svelte-nwoktd"></span>'),la=i('<button type="button"><!></button>'),ma=i('<div class="seat-map svelte-nwoktd"></div>');function Sa(p,e){K(e,!0);const _=()=>U(sa,"$_",f),[f,v]=V();let k=N(e,"disabledSeats",19,()=>[]),m=N(e,"selectedSeat",19,()=>-1);function u(o){return e.players.filter(t=>t.seatPosition===o)}var b=ma();C(b,20,()=>Array.from({length:8},(o,t)=>t),o=>o,(o,t)=>{const l=y(()=>u(t)),S=y(()=>k().includes(t));var s=la();let w;var B=A(s);{var D=r=>{var g=na();C(g,21,()=>a(l),h=>h.name,(h,I)=>{const P=y(()=>ra(a(I).icon));var c=oa();let x;var E=A(c);{var F=$=>{var z=X(),G=q(z);Z(G,()=>a(P),(H,J)=>{J(H,{size:40})}),n($,z)};j(E,$=>{a(P)&&$(F)})}d(c),M(()=>x=ta(c,"",x,{"--player-ring":`var(--${a(I).color??""})`})),n(h,c)}),d(g),n(r,g)};j(B,r=>{a(l).length>0&&r(D)})}d(s),M(r=>{w=ea(s,1,`seat-map__btn seat-map__btn--${t??""}`,"svelte-nwoktd",w,{"seat-map__btn--claimed":a(l).length>0,"seat-map__btn--selected":m()===t,"seat-map__btn--disabled":a(S)}),s.disabled=a(S),aa(s,"aria-label",r)},[()=>a(l).length>0?a(l).map(r=>r.name).join(", "):_()("setup.seat_aria",{values:{n:t+1}})]),Y("click",s,()=>e.onselect(t)),n(o,s)}),d(b),n(p,b),L(),v()}W(["click"]);export{Sa as S,ka as X};
