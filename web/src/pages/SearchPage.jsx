// Maquetado estático de "Buscar productos" (HU-03, solo estado con resultados). Sin llamadas a la
// API: el campo, los filtros y los botones son solo visuales.
import { useState } from 'react';
import ProductCard from '../components/ProductCard.jsx';
import { searchResultsSample } from '../data/searchResultsSample.js';

export default function SearchPage() {
  const { termino, marcas, categorias, productos } = searchResultsSample;
  const [query, setQuery] = useState(termino);
  const [marca, setMarca] = useState('');
  const [categoria, setCategoria] = useState('');

  return (
    <section className="search">
      <h1>Buscar productos</h1>
      <form className="search-form" role="search" onSubmit={(event) => event.preventDefault()}>
        <label className="visually-hidden" htmlFor="search-query">
          Producto, marca o categoría
        </label>
        <input
          id="search-query"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Busca por nombre, marca o categoría"
        />
        <button type="submit" className="button button--primary">
          Buscar
        </button>
      </form>

      <div className="search-filters">
        <div className="field">
          <label htmlFor="filter-marca">Marca</label>
          <select
            id="filter-marca"
            value={marca}
            onChange={(event) => setMarca(event.target.value)}
          >
            <option value="">Todas</option>
            {marcas.map((nombre) => (
              <option key={nombre} value={nombre}>
                {nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="filter-categoria">Categoría</label>
          <select
            id="filter-categoria"
            value={categoria}
            onChange={(event) => setCategoria(event.target.value)}
          >
            <option value="">Todas</option>
            {categorias.map((nombre) => (
              <option key={nombre} value={nombre}>
                {nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="search-summary">{`${productos.length} productos encontrados para «${termino}»`}</p>

      <div className="results-grid">
        {productos.map((producto) => (
          <ProductCard key={producto.id} producto={producto} />
        ))}
      </div>
    </section>
  );
}
