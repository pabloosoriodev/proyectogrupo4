function formatPrice(value) {
  return `S/ ${value.toFixed(2)}`;
}

export default function ProductCard({ producto }) {
  return (
    <article className="product-card" aria-labelledby={`producto-${producto.id}`}>
      <h3 id={`producto-${producto.id}`} className="product-card__name">
        {producto.nombre}
      </h3>
      <p className="product-card__meta">
        <span className="product-card__brand">{producto.marca}</span>
        <span className="product-card__size">{producto.tamano}</span>
      </p>
      <p className="product-card__price">{`Desde ${formatPrice(producto.precioMin)}`}</p>
      <p className="product-card__stores">
        {`Disponible en ${producto.cantidadComercios} comercios`}
      </p>
      {/* Solo visual en el Sprint 0: la comparación llega con HU-04. */}
      <button type="button" className="button button--secondary">
        Comparar precios
      </button>
    </article>
  );
}
