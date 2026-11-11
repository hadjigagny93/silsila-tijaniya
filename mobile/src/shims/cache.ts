import { refresh } from "../navigation";

// Remplace next/cache : après une écriture, la page courante recharge ses données.
export function revalidatePath() {
  refresh();
}

export function revalidateTag() {
  refresh();
}
