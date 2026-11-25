// Escritura en PostgreSQL de HU-01 (ADR-0003): tablas `comercio` y `publicacion`.

// Caso B7 / decisión 5: crea o actualiza cada comercio configurado.
const UPSERT_COMERCIOS = `
  INSERT INTO comercio (slug, nombre, activo)
  SELECT * FROM unnest($1::text[], $2::text[], $3::boolean[])
  ON CONFLICT (slug) DO UPDATE SET nombre = EXCLUDED.nombre, activo = EXCLUDED.activo
  RETURNING id, slug
`;

// Casos B3 y F3: una fila por (comercio_id, url); si ya existe se actualizan precios y fecha.
// grupo_id no se toca (decisión 11). Lo que no aparece no se borra (caso B4, decisión 6).
const UPSERT_PUBLICACIONES = `
  INSERT INTO publicacion (
    comercio_id, nombre_original, marca, categoria_origen, url,
    precio_regular, precio_oferta, fecha_captura
  )
  SELECT $1::integer, nombre, marca, categoria, url, regular, oferta, fecha
  FROM unnest(
    $2::text[], $3::text[], $4::text[], $5::text[],
    $6::numeric[], $7::numeric[], $8::timestamptz[]
  ) AS fila(nombre, marca, categoria, url, regular, oferta, fecha)
  ON CONFLICT (comercio_id, url) DO UPDATE SET
    nombre_original = EXCLUDED.nombre_original,
    marca = EXCLUDED.marca,
    categoria_origen = EXCLUDED.categoria_origen,
    precio_regular = EXCLUDED.precio_regular,
    precio_oferta = EXCLUDED.precio_oferta,
    fecha_captura = EXCLUDED.fecha_captura
`;

const aNumeric = (valor) => (valor === null ? null : valor.toFixed(2));

function crearRepositorio(pool) {
  async function guardarComercios(comercios) {
    const { rows } = await pool.query(UPSERT_COMERCIOS, [
      comercios.map((c) => c.slug),
      comercios.map((c) => c.nombre),
      comercios.map((c) => c.activo),
    ]);
    return new Map(rows.map((fila) => [fila.slug, fila.id]));
  }

  // Todo o nada por comercio (decisión 9): una sola transacción con todas sus publicaciones.
  async function guardarPublicaciones(comercioId, productos) {
    const cliente = await pool.connect();
    try {
      await cliente.query('BEGIN');
      await cliente.query(UPSERT_PUBLICACIONES, [
        comercioId,
        productos.map((p) => p.nombreOriginal),
        productos.map((p) => p.marca),
        productos.map((p) => p.categoriaOrigen),
        productos.map((p) => p.url),
        productos.map((p) => aNumeric(p.precioRegular)),
        productos.map((p) => aNumeric(p.precioOferta)),
        productos.map((p) => p.fechaCaptura.toISOString()),
      ]);
      await cliente.query('COMMIT');
    } catch (error) {
      try {
        await cliente.query('ROLLBACK');
      } catch {
        // La conexión ya está rota; el error original es el que importa.
      }
      throw error;
    } finally {
      cliente.release();
    }
  }

  return { guardarComercios, guardarPublicaciones };
}

module.exports = { crearRepositorio };
