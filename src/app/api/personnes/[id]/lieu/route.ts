import { getStore } from "@/lib/data";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = getStore();
  const image = await store.getPlaceImage(id);
  if (!image) return new Response(null, { status: 404 });
  // Un admin connecté peut lire des images non publiques : jamais en cache partagé.
  const admin = !process.env.SQLITE_PATH && (await store.getSession())?.isAdmin;

  return new Response(new Uint8Array(image), {
    headers: {
      "Content-Type": "image/jpeg",
      // En ligne, les images ne changent qu'à la publication depuis le Mac : le CDN de Vercel les garde une heure.
      "Cache-Control": process.env.SQLITE_PATH
        ? "no-cache"
        : admin
          ? "private, no-store"
        : "public, max-age=600, s-maxage=3600, stale-while-revalidate=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
