'use client';
import {BUTTONS} from './ending';
import {PW,PH} from './press';
import s from './InkTracePress.module.css';

type Props={open:boolean;onHover:(id:typeof BUTTONS[number]['id']|null)=>void};

/** Real links laid exactly over the two printed buttons. They carry no ink of their
 *  own: hovering or focusing one reprints its button, so the sheet answers the hand. */
export default function WaysIn({open,onHover}:Props){
 return <nav className={s.waysIn} aria-label="InkTrace" data-open={open} aria-hidden={!open}>
  {BUTTONS.map(b=><a key={b.id} href={b.href} target="_blank" rel="noopener noreferrer" aria-label={b.label} tabIndex={open?0:-1}
   className={s.wayIn} style={{left:`${b.x/PW*100}%`,top:`${b.y/PH*100}%`,width:`${b.w/PW*100}%`,height:`${b.h/PH*100}%`}}
   onPointerEnter={()=>onHover(b.id)} onPointerLeave={()=>onHover(null)} onFocus={()=>onHover(b.id)} onBlur={()=>onHover(null)}/>)}
 </nav>;
}
