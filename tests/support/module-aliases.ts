import Module from "node:module";
import { join } from "node:path";

/*
 * Resuelve el alias "@/..." de Next.js en la salida CommonJS de las pruebas,
 * para que los componentes se prueben con los mismos imports que usa la app.
 */
const compiledSourceRoot = join(__dirname, "..", "..", "src");
const moduleWithResolver = Module as unknown as {
  _resolveFilename: (request: string, ...rest: unknown[]) => string;
};
const resolveFilename = moduleWithResolver._resolveFilename;

moduleWithResolver._resolveFilename = function resolveWithAlias(request, ...rest) {
  const target = request.startsWith("@/")
    ? join(compiledSourceRoot, request.slice(2))
    : request;
  return resolveFilename.call(this, target, ...rest);
};
