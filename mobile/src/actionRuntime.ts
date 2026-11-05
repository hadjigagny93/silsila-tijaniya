import { navigate, NotFoundSignal, RedirectSignal, refresh } from "./navigation";
import { scheduleReminders } from "./notifications";
import { scheduleSync } from "./syncClient";

// Une action de src/app/actions.ts, exécutée dans l'app : après l'écriture, la page recharge ses données
// et une synchronisation avec le Mac est prévue ; un redirect() mène à la page demandée.
export function wrapAction<Args extends unknown[], Result>(action: (...args: Args) => Promise<Result>) {
  return async (...args: Args): Promise<Result | undefined> => {
    try {
      const result = await action(...args);
      scheduleSync();
      scheduleReminders();
      refresh();
      return result;
    } catch (error) {
      if (error instanceof RedirectSignal) {
        scheduleSync();
        scheduleReminders();
        navigate(error.url);
        refresh();
        return undefined;
      }
      if (error instanceof NotFoundSignal) {
        navigate("/");
        return undefined;
      }
      throw error;
    }
  };
}
