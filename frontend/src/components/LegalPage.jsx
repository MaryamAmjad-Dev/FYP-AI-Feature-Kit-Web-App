import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaTimes } from 'react-icons/fa';

/**
 * Shared shell for the legal pages (Terms, Terms of Service, Privacy Policy).
 *
 * Ek hi layout teen pages mein copy-paste tha — yahan sab common cheezein
 * ek jagah: full-screen overlay, close (history fallback ke saath), scroll
 * reset, table of contents, aur footer navigation.
 *
 * Props:
 * - title:   page heading
 * - intro:   opening paragraph
 * - sections: [{ heading, items?: string[], body?: string }]
 * - backTo:  { to, label } for the primary footer button (default Home)
 */
const LegalPage = ({ title, intro, sections, backTo }) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const scrollRef = useRef(null);

  useEffect(() => {
    // Overlay khud scroll hota hai — dono jagah top par le jao.
    window.scrollTo(0, 0);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [pathname]);

  const handleClose = () => {
    // history.state.idx = react-router ka in-app history index. Agar 0 hai
    // (ya tab pehla entry hai) to peeche browser/external entry hogi — wahan
    // wapas jane ke bajaye home par jao. idx > 0 matlab ek in-app page
    // hamare peeche hai, to usi par wapas jao.
    if ((window.history.state?.idx || 0) > 0) navigate(-1);
    else navigate('/');
  };

  const headingId = (text) =>
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

  const target = backTo || { to: '/', label: 'Back to Home' };

  return (
    <div
      ref={scrollRef}
      className="fixed inset-0 z-40 page-bg text-white overflow-y-auto px-4 sm:px-6 py-16 sm:py-10"
    >
      <div className="max-w-4xl mx-auto relative bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 sm:p-8 shadow-2xl text-gray-200">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-white text-xl hover:text-pink-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 rounded"
          title="Close"
          aria-label="Close this page"
        >
          <FaTimes />
        </button>

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-center mb-4 gradient-title">
          {title}
        </h1>

        {/* Table of contents */}
        <nav
          aria-label="Page sections"
          className="mb-8 rounded-xl border border-white/15 bg-white/5 p-4"
        >
          <p className="text-xs uppercase tracking-wide text-white/60 mb-2">On this page</p>
          <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
            {sections.map((section) => (
              <li key={section.heading}>
                <a
                  href={`#${headingId(section.heading)}`}
                  className="text-pink-300 hover:text-pink-200 hover:underline"
                >
                  {section.heading}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-6 text-sm md:text-base leading-relaxed">
          <p>{intro}</p>

          {sections.map((section) => (
            <section key={section.heading} id={headingId(section.heading)}>
              <h2 className="text-xl font-semibold text-white">{section.heading}</h2>
              {section.items && (
                <ul className="list-disc list-inside space-y-1">
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
              {section.body && <p>{section.body}</p>}
            </section>
          ))}

          <div className="text-center pt-6">
            <button
              onClick={() => navigate(target.to)}
              className="btn-primary text-white font-semibold py-3 px-8 rounded-lg transition-all"
            >
              {target.label}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LegalPage;
