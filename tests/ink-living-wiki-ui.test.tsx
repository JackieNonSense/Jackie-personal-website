import {fireEvent,render,screen,within} from '@testing-library/react';
import {describe,it,expect,vi} from 'vitest';
import WikiStudy from '../components/studies/inktrace-living/WikiStudy';

describe('working typesetting workshop',()=>{
 it('renders readable real article content separately from the animated environment',()=>{
  const {container}=render(<WikiStudy still/>);
  expect(screen.getByRole('article',{name:'The Northern Coast'})).toBeVisible();
  expect(screen.getByRole('img',{name:'Cobalt map of the fictional Northern Coast'})).toBeVisible();
  expect(container.querySelector('canvas')).toHaveAttribute('aria-hidden','true');
  expect(screen.getByText('FEATURE DEMO / SAMPLE CONTENT')).toBeVisible();
  expect(container.querySelector('audio,video,iframe')).toBeNull();
 });
 it('changes real image float and width, then remains in visitor control',()=>{
  const {container}=render(<WikiStudy still/>);
  fireEvent.click(screen.getByRole('button',{name:'Wrap right'}));
  const figure=container.querySelector('figure[data-wiki-image]');
  expect(figure).toHaveStyle({float:'right',width:'44%'});
  expect(screen.getByText('Your edit / replay to watch again')).toBeVisible();
  fireEvent.keyDown(screen.getByRole('slider',{name:'Resize illustration'}),{key:'ArrowRight'});
  expect(figure).toHaveStyle({width:'49%'});
  fireEvent.click(screen.getByRole('button',{name:'Wide image'}));
  expect(figure).toHaveStyle({float:'none',width:'100%'});
 });
 it('reorders the actual quotation node instead of only changing a label',()=>{
  const {container}=render(<WikiStudy still/>);
  fireEvent.click(screen.getByRole('button',{name:'Move quotation earlier'}));
  const quote=container.querySelector('[data-wiki-quote]')!;
  const paragraph=container.querySelector('[data-paragraph="second"]')!;
  expect(quote.compareDocumentPosition(paragraph)&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:'Move quotation later'}));
  expect(quote.compareDocumentPosition(paragraph)&Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
 });
 it('opens a linked record in a separate reading slot after the manuscript',()=>{
  render(<WikiStudy still/>);
  fireEvent.click(screen.getByRole('button',{name:'Mara, open character record'}));
  const slot=screen.getByRole('region',{name:'Linked record'});
  expect(within(slot).getByRole('heading',{name:'Mara / The archivist'})).toBeVisible();
  expect(screen.getByRole('article').contains(slot)).toBe(false);
  expect(screen.getByRole('article').compareDocumentPosition(slot)&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:'Outer Coast, open Wiki record'}));
  expect(within(slot).getByRole('heading',{name:'Outer Coast / Region'})).toBeVisible();
  fireEvent.click(screen.getByRole('button',{name:'Close linked record'}));
  expect(within(slot).getByText('Select a linked name in the page.')).toBeVisible();
 });
 it('keeps key steps usable with motion held and resets on replay',()=>{
  render(<WikiStudy still/>);
  expect(screen.queryByRole('button',{name:'Continue demo'})).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Next key step'}));
  expect(screen.getByText('02 / Bring the map')).toBeVisible();
  fireEvent.click(screen.getByRole('button',{name:'Replay demonstration'}));
  expect(screen.getByText('01 / A page to begin with')).toBeVisible();
 });
 it('closing stops the scene; reopening starts from the beginning',()=>{
  render(<WikiStudy still/>);
  fireEvent.click(screen.getByRole('button',{name:'Wrap left'}));
  fireEvent.click(screen.getByRole('button',{name:'Close Wiki workshop'}));
  expect(screen.queryByRole('article')).not.toBeInTheDocument();
  const opener=screen.getByRole('button',{name:'Open Wiki workshop'});
  expect(opener).toHaveFocus();
  fireEvent.click(opener);
  expect(screen.getByText('01 / A page to begin with')).toBeVisible();
 });
 it('keeps the layout controls and article available when map art fails',()=>{
  render(<WikiStudy still/>);
  fireEvent.error(screen.getByRole('img',{name:'Cobalt map of the fictional Northern Coast'}));
  expect(screen.getByText('Northern Coast — illustration unavailable')).toBeVisible();
  expect(screen.getByRole('button',{name:'Wrap right'})).toBeEnabled();
  expect(screen.getByRole('article')).toBeVisible();
 });
 it('returns keyboard focus to a useful place after reopening and closing a linked record',()=>{
  render(<WikiStudy still/>);
  fireEvent.click(screen.getByRole('button',{name:'Close Wiki workshop'}));
  fireEvent.click(screen.getByRole('button',{name:'Open Wiki workshop'}));
  expect(screen.getByRole('button',{name:'Close Wiki workshop'})).toHaveFocus();
  fireEvent.click(screen.getByRole('button',{name:'Mara, open character record'}));
  fireEvent.click(screen.getByRole('button',{name:'Close linked record'}));
  expect(screen.getByRole('button',{name:'Mara, open character record'})).toHaveFocus();
 });
 it('detects an image that failed before hydration attached the error listener',async()=>{
  const complete=vi.spyOn(HTMLImageElement.prototype,'complete','get').mockReturnValue(true);
  const graphics=vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(null);
  try{render(<WikiStudy still/>);expect(await screen.findByText('Northern Coast — illustration unavailable')).toBeVisible();}
  finally{complete.mockRestore();graphics.mockRestore();}
 });
});
