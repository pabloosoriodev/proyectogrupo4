import HealthPage from './pages/HealthPage.jsx';
import SearchPage from './pages/SearchPage.jsx';

const PAGES = {
  '/': HealthPage,
  '/buscar': SearchPage,
};

function normalizePath(pathname) {
  return pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
}

export default function App({ pathname = window.location.pathname }) {
  const Page = PAGES[normalizePath(pathname)] ?? HealthPage;
  return (
    <div className="app">
      <header className="app-header">
        <a className="brand" href="/">
          Comparador de precios
        </a>
        <nav>
          <a href="/buscar">Buscar productos</a>
        </nav>
      </header>
      <main className="app-main">
        <Page />
      </main>
    </div>
  );
}
