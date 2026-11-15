import { redirect } from "next/navigation";

// Les biographies s'ouvrent depuis les Gens de la Voie : l'ancienne liste y renvoie.
export default function BiographiesPage() {
  redirect("/mouqaddams");
}
