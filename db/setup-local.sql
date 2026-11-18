-- Crea la base y el usuario de desarrollo LOCAL (aclaración 18 de SPRINT0.md).
-- Solo para el PostgreSQL 16 local; no se ejecuta en AWS.
-- La contraseña no vive en este archivo: entra como variable de psql. Ejecutar como `postgres`:
--
--   psql -U postgres -h localhost -p 5432 -v app_password=<contraseña-del-.env> -f db/setup-local.sql
--
-- Es idempotente: si el usuario ya existe, solo actualiza su contraseña.

\set ON_ERROR_STOP on

\if :{?app_password}
\else
  \echo 'Falta la contrasena: ejecuta psql con -v app_password=<DB_PASSWORD del .env>'
  \quit
\endif

SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', 'comparador_app', :'app_password')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'comparador_app')
\gexec

SELECT format('ALTER ROLE %I LOGIN PASSWORD %L', 'comparador_app', :'app_password')
\gexec

SELECT format('CREATE DATABASE %I OWNER %I', 'comparador_dev', 'comparador_app')
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'comparador_dev')
\gexec
