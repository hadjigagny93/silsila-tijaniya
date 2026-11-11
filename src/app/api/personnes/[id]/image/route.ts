import { getStore } from "@/lib/data";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const image = await getStore().getPersonImage(id);
  if (!image) return new Response(null, { status: 404 });

  return new Response(new Uint8Array(image), {
    headers: {
      "Content-Type": "image/jpeg",
      // En ligne, les photos ne changent qu'à la publication depuis le Mac : le CDN de Vercel les garde une heure.
      "Cache-Control": process.env.SQLITE_PATH
        ? "no-cache"
        : "public, max-age=600, s-maxage=3600, stale-while-revalidate=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
