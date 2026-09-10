"use client";
import {useEffect,useRef} from 'react';
import {mountUI} from '../standalone/ui.js';
import {BesoGame} from '../game/engine.js';
export default function Game(){const host=useRef<HTMLDivElement>(null);useEffect(()=>{if(!host.current)return;const node=host.current;const game=mountUI(node,(stage:HTMLDivElement,emit:(s:unknown)=>void)=>new BesoGame(stage,emit));if(import.meta.env.DEV)(window as any).__beso=game;return()=>{game?.dispose();node.replaceChildren();};},[]);return <div ref={host}/>;}

