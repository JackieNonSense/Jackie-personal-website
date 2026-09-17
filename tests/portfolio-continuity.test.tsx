import {fireEvent, render, screen, within} from '@testing-library/react';
import {describe, expect, it} from 'vitest';
import Portfolio from '../components/portfolio/Portfolio';

describe('approved poster continuity preserves the person behind it', () => {
  it('uses ABOUT ME while retaining the complete personal introduction and all three practice groups', () => {
    render(<Portfolio/>);
    const about = screen.getByRole('region', {name: 'ABOUT ME'});
    expect(about).toHaveTextContent('Yuchao Wang');
    expect(about).toHaveTextContent('The first internet felt like another world.');
    expect(about).toHaveTextContent('The world is turning over fast, and little feels certain now. I’m bringing back some of what did.');
    expect(about).toHaveTextContent('Based in Sydney; computer science at UNSW.');
    expect(about).toHaveTextContent('Nothing has felt more worth doing. I’m not going to stop.');
    // Each group names something that exists, so the list cannot drift back into
    // a stack of browser features any other site could also list.
    for (const text of ['INTERFACES', 'Things you can operate,', 'not just look at', 'EXPERIMENTS', 'A CD deck, a CRT terminal,', 'a small puzzle behind it', 'INKTRACE', 'An independent platform', 'for people who write']) {
      expect(about).toHaveTextContent(text);
    }
    expect(within(about).getByRole('link', {name: 'Explore experiments ↓'})).toHaveAttribute('href', '#experiments');
  });

  it('retains the biography and every practice group when global motion is paused', () => {
    render(<Portfolio/>);
    fireEvent.click(screen.getByRole('button', {name: '暂停动态效果'}));
    const about = screen.getByRole('region', {name: 'ABOUT ME'});
    expect(about).toHaveTextContent('Based in Sydney; computer science at UNSW.');
    expect(about).toHaveTextContent('for people who write');
    expect(screen.getByRole('button', {name: '恢复动态效果'})).toHaveAttribute('aria-pressed', 'true');
  });

  it('keeps contact destinations, terminal navigation and the single continuous paper fault', () => {
    const {container} = render(<Portfolio/>);
    expect(screen.getByRole('heading', {name: 'LET’S CONNECT'})).toBeInTheDocument();
    expect(screen.getByRole('link', {name: 'EMAIL ↗'})).toHaveAttribute('href', 'mailto:whoisjackie1127@gmail.com');
    expect(screen.getByRole('link', {name: 'GITHUB ↗'})).toHaveAttribute('href', 'https://github.com/JackieNonSense');
    expect(screen.getByRole('link', {name: 'LINKEDIN ↗'})).toHaveAttribute('href', 'https://www.linkedin.com/in/yuchao-wang-4a014b198/');
    expect(screen.getByRole('link', {name: 'Open monitor'})).toHaveAttribute('href', '/terminal');
    expect(container.querySelectorAll('[data-testid="paper-fault"]')).toHaveLength(1);
  });
});
