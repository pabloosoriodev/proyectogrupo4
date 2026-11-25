// HU-01: primeras tablas de negocio (contrato HU-01, "Nombres que no se negocian").
// Regla del proyecto (CLAUDE.md §9): migraciones no bloqueantes. Las tablas son nuevas (nadie las
// lee todavía) y los índices únicos se crean con CONCURRENTLY, que no puede ir dentro de una
// transacción: por eso la migración usa noTransaction() y cada sentencia es idempotente
// (IF NOT EXISTS), de modo que se puede reintentar si se corta a mitad.

exports.up = (pgm) => {
  pgm.noTransaction();

  pgm.sql(`
    CREATE TABLE IF NOT EXISTS comercio (
      id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      slug text NOT NULL,
      nombre text NOT NULL,
      activo boolean NOT NULL
    )
  `);
  pgm.sql('CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS comercio_slug_key ON comercio (slug)');

  // grupo_id queda nulo y sin clave foránea: la tabla de grupos llega con HU-02 (decisión 11).
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS publicacion (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      comercio_id integer NOT NULL REFERENCES comercio (id),
      grupo_id bigint NULL,
      nombre_original text NOT NULL,
      marca text NULL,
      categoria_origen text NULL,
      url text NOT NULL,
      precio_regular numeric(10, 2) NOT NULL CHECK (precio_regular >= 0),
      precio_oferta numeric(10, 2) NULL
        CHECK (precio_oferta IS NULL OR (precio_oferta >= 0 AND precio_oferta < precio_regular)),
      fecha_captura timestamptz NOT NULL
    )
  `);
  // Único (comercio_id, url): también sirve de índice para la clave foránea a comercio.
  pgm.sql(
    'CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS publicacion_comercio_id_url_key ' +
      'ON publicacion (comercio_id, url)',
  );
};

exports.down = (pgm) => {
  pgm.noTransaction();
  pgm.sql('DROP TABLE IF EXISTS publicacion');
  pgm.sql('DROP TABLE IF EXISTS comercio');
};
