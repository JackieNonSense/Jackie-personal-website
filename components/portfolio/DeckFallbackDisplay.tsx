"use client";

import {useEffect,useRef} from 'react';
import type {MusicSnapshot} from './music-controller';
import {musicTracks} from './music-tracks';
import {drawVfd} from './deck-vfd';
import {displayMotion} from './deck-display-motion';
import panel from './deck-panel.json';

// Same upright glass plane as the Blender model. The surrounding poster supplies
// only the casing; playback information is always drawn from the live snapshot.
const glass={centerY:.65,width:14.4,height:5.86,radius:.29};
const staticMotion=displayMotion(500,null,true);
const silentSpectrum=Array(32).fill(0) as number[];

export default function DeckFallbackDisplay({state,alternate=false}:{state:MusicSnapshot;alternate?:boolean}){
  const canvas=useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    if(!state.powered||!canvas.current)return;
    drawVfd(canvas.current,{
      title:musicTracks[state.track].title,track:state.track+1,time:state.time,
      volume:state.volume,status:state.status,lit:1,alternate,
      levels:silentSpectrum,motion:staticMotion,
    });
  },[state,alternate]);

  if(!state.powered)return null;
  return <canvas ref={canvas} width={2048} height={832} aria-hidden="true" data-deck-fallback-display="true" style={{
    position:'absolute',
    left:`${(.5+(panel.screenX-glass.width/2)/panel.stage.width)*100}%`,
    top:`${(.5-(glass.centerY+glass.height/2-panel.stage.cameraY)/panel.stage.height)*100}%`,
    width:`${glass.width/panel.stage.width*100}%`,height:`${glass.height/panel.stage.height*100}%`,
    borderRadius:`${glass.radius/glass.width*100}% / ${glass.radius/glass.height*100}%`,
    background:'#02080c',zIndex:1,pointerEvents:'none',
  }}/>;
}
