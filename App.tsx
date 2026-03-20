import React from 'react';
import CollageEditor from './components/CollageEditor';

const App: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center p-4 sm:p-6 lg:p-8">

      {/* ── HEADER ── */}
      <header className="text-center mb-8 w-full max-w-7xl">
        <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-500 pb-2 px-1">
          AkariuPhoto Kolase
        </h1>
        <p className="text-slate-400 mt-2">
          Buat kolase foto dengan mudah — gratis, tanpa login{' '}
          <a
            href="https://akariu.blogspot.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-400 hover:text-indigo-300 underline"
          >
            akariu.blogspot.com
          </a>
        </p>
      </header>

      {/* ── COLLAGE EDITOR ── */}
      <main className="w-full max-w-7xl">
        <CollageEditor />
      </main>

      {/* ── FOOTER ── */}
      <footer className="mt-12 text-center text-xs text-slate-600">
        <p>Semua proses berjalan di browser kamu — foto tidak dikirim ke server manapun.</p>
      </footer>

    </div>
  );
};

export default App;