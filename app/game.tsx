"use client";
import {useEffect,useRef} from 'react';
import {mountUI} from '../standalone/ui.js';
import {BesoGame} from '../game/engine.js';
declare global {
  interface Window { __beso?: unknown }
}

export default function Game(){
 const host=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  if(!host.current)return;
  const node=host.current;
  const game=mountUI(node,(stage:HTMLDivElement,emit:(s:unknown)=>void)=>new BesoGame(stage,emit));
  const debugHost=['localhost','127.0.0.1'].includes(location.hostname);
  if(debugHost)window.__beso=game;
  return()=>{
   if(debugHost)delete window.__beso;
   game?.dispose();
   node.replaceChildren();
  };
 },[]);
 return <div ref={host}/>;
}

