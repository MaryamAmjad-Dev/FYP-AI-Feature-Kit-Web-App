/**
 * Render smoke test — every page is rendered through react-dom/server so a
 * render-time crash (undefined variable, bad prop, missing context) fails the
 * build instead of shipping. Run with:
 *   npm run test:render
 * Effects do not run in SSR, so the browser-only APIs are stubbed below.
 */
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

import Navbar from './src/components/Navbar';
import Footer from './src/components/Footer';
import Login from './src/pages/Login';
import Signup from './src/pages/Signup';
import About from './src/pages/About';
import Contact from './src/pages/Contact';
import AuthCallback from './src/pages/AuthCallback';
import Profile from './src/pages/Profile';
import History from './src/pages/History';
import TextSummarizer from './src/pages/TextSummarizer';
import TexttoSpeech from './src/pages/TexttoSpeech';
import VoiceChanger from './src/pages/VoiceChanger';
import TexttoImage from './src/pages/TexttoImage';
import RemoveBg from './src/pages/RemoveBg';
import ForgotPassword from './src/pages/ForgotPassword';

const storage = () => {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    clear: () => map.clear(),
  };
};

globalThis.localStorage = storage();
globalThis.sessionStorage = storage();
globalThis.window = {
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent() {},
  location: { pathname: '/', search: '', href: 'http://localhost/' },
  speechSynthesis: { getVoices: () => [], cancel() {}, speak() {}, pause() {}, resume() {}, speaking: false, paused: false },
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
};
globalThis.document = {
  addEventListener() {},
  removeEventListener() {},
  createElement: () => ({ style: {}, setAttribute() {}, select() {}, appendChild() {} }),
  body: { appendChild() {}, removeChild() {} },
  visibilityState: 'visible',
};
globalThis.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };

const pages = {
  Navbar,
  Footer,
  Login,
  Signup,
  About,
  Contact,
  AuthCallback,
  Profile,
  History,
  TextSummarizer,
  TexttoSpeech,
  VoiceChanger,
  TexttoImage,
  RemoveBg,
  ForgotPassword,
};

const results = {};
let failures = 0;

for (const [name, Page] of Object.entries(pages)) {
  try {
    const html = renderToString(
      <MemoryRouter initialEntries={['/']}>
        <Page />
      </MemoryRouter>
    );
    if (!html || html.length < 40) {
      results[name] = 'EMPTY OUTPUT';
      failures += 1;
    } else {
      results[name] = `OK (${html.length} chars)`;
    }
  } catch (error) {
    results[name] = `FAIL: ${error.message}`;
    failures += 1;
  }
}

console.log(JSON.stringify(results, null, 2));
console.log(failures === 0 ? 'ALL PAGES RENDERED' : `${failures} PAGE(S) FAILED`);
globalThis.process.exit(failures === 0 ? 0 : 1);
