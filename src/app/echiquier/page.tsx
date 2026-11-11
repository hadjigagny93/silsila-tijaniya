import { redirect } from "next/navigation";

// L'Échiquier vit maintenant en bas du Suluk : l'ancienne adresse y mène.
export default function EchiquierPage() {
  redirect("/suluk#echiquier");
}
