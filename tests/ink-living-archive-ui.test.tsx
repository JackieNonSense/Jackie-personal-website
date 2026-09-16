import {render,screen,fireEvent,within} from '@testing-library/react';
import {describe,it,expect} from 'vitest';
import LivingArchive from '../components/studies/inktrace-living/LivingArchive';
const open=()=>{render(<LivingArchive still/>);fireEvent.click(screen.getByRole('button',{name:'Open the Living Archive'}));};
describe('four-scene archive',()=>{
 it('starts as a book and opens the time scroll, silently',()=>{open();expect(screen.getByRole('heading',{name:'InkTrace — Timeline'})).toBeVisible();expect(document.querySelector('audio,video,iframe')).toBeNull();});
 it('shows real year/month/event levels with a separate reading slot',()=>{
  open();fireEvent.click(screen.getByRole('button',{name:'Year 313'}));
  expect(screen.queryByRole('button',{name:'September'})).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'May'}));fireEvent.click(screen.getByRole('button',{name:/17.*A signal received/}));
  expect(within(screen.getByRole('region',{name:'Archive reading slot'})).getByRole('heading',{name:'A signal received'})).toBeVisible();
 });
 it('manual tab focus does not switch scenes until activation',()=>{
  open();const time=screen.getByRole('tab',{name:/Timeline/});time.focus();fireEvent.keyDown(time,{key:'ArrowRight'});
  expect(screen.getByRole('tab',{name:/Characters/})).toHaveFocus();expect(time).toHaveAttribute('aria-selected','true');
  fireEvent.click(screen.getByRole('tab',{name:/Characters/}));
  expect(screen.getByRole('heading',{name:'InkTrace — Characters'})).toBeVisible();
  fireEvent.click(screen.getByRole('button',{name:'Sen, view character'}));
  expect(within(screen.getByRole('region',{name:'Archive reading slot'})).getByText('The guide')).toBeVisible();
  expect(screen.getByRole('button',{name:'Mara, view character'})).toBeVisible();
 });
 it('requires a real confirmation after AI preview, then allows review again',()=>{
  open();fireEvent.click(screen.getByRole('tab',{name:/AI Assistant/}));
  expect(screen.queryByRole('button',{name:'Confirm and create canvas'})).not.toBeInTheDocument();
  for(let i=0;i<5;i++)fireEvent.click(screen.getByRole('button',{name:'Next key step'}));
  expect(screen.getByText('Waiting for confirmation')).toBeVisible();
  fireEvent.click(screen.getByRole('button',{name:'Confirm and create canvas'}));expect(screen.getByRole('heading',{name:'Canvas created'})).toBeVisible();
  fireEvent.click(screen.getByRole('button',{name:'Preview again'}));expect(screen.queryByText('Canvas created')).not.toBeInTheDocument();
 });
 it('lets a visitor request the complete preview without waiting for autoplay',()=>{
  open();fireEvent.click(screen.getByRole('tab',{name:/AI Assistant/}));
  fireEvent.click(screen.getByRole('button',{name:'Preview connections'}));
  expect(screen.getByRole('heading',{name:'Waiting for confirmation'})).toBeVisible();
  expect(screen.queryByRole('heading',{name:'Canvas created'})).not.toBeInTheDocument();
 });
 it('integrates the real Wiki layout with just one window and one transport',()=>{
  open();fireEvent.click(screen.getByRole('tab',{name:/Wiki/}));
  fireEvent.click(screen.getByRole('button',{name:'Wrap right'}));
  expect(document.querySelector('[data-wiki-image]')).toHaveStyle({float:'right',width:'44%'});
  expect(screen.getAllByRole('button',{name:'Replay demonstration'})).toHaveLength(1);
  expect(screen.getAllByRole('main')).toHaveLength(1);
 });
 it('Escape closes and returns focus to the book; reopening resets to Timeline',()=>{
  open();fireEvent.click(screen.getByRole('tab',{name:/AI Assistant/}));
  fireEvent.keyDown(screen.getByRole('button',{name:'Close Living Archive'}),{key:'Escape'});
  expect(screen.getByRole('button',{name:'Open the Living Archive'})).toHaveFocus();
  fireEvent.click(screen.getByRole('button',{name:'Open the Living Archive'}));expect(screen.getByRole('heading',{name:'InkTrace — Timeline'})).toBeVisible();
 });
});
