// api/config.js — Vercel serverless function.
// Devuelve la URL del proyecto Supabase y su llave publicable (anon) para que
// la app pueda leer y escribir la base de datos. Ambas salen de variables de
// entorno de Vercel: NUNCA se escribe ninguna llave en el código ni en index.html.
// Variables requeridas en Vercel (Project → Settings → Environment Variables):
//   NEXT_PUBLIC_SUPABASE_URL
//   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
// La llave publicable (anon) es la que Supabase muestra en el diálogo Connect
// y en Settings → API Keys. Es una llave de solo cliente, limitada por las
// políticas RLS abiertas de este proyecto (acceso libre por liga, decisión del dueño).

export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || null,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || null,
  });
}
