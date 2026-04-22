import Dexie, { type EntityTable } from "dexie";

import type {
  AdapterDiagnostics,
  AnswerPlan,
  Profile,
  Question,
  Session
} from "../shared/types";
import { ATTI_DB_NAME, ATTI_DB_STORES, ATTI_DB_VERSION } from "./schema";

export class AttiDatabase extends Dexie {
  profiles!: EntityTable<Profile, "id">;
  sessions!: EntityTable<Session, "id">;
  questions!: EntityTable<Question, "id">;
  answerPlans!: EntityTable<AnswerPlan, "id">;
  adapterDiagnostics!: EntityTable<AdapterDiagnostics, "id">;

  constructor(name = ATTI_DB_NAME) {
    super(name);

    this.version(ATTI_DB_VERSION).stores(ATTI_DB_STORES);
  }
}

export function createAttiDatabase(name?: string) {
  return new AttiDatabase(name);
}

export const attiDb = createAttiDatabase();
