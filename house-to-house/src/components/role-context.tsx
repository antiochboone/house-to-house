"use client";

// Demo role switcher for Milestone 1 — replaced by real auth (magic link + profiles)
// in Milestone 2. Lets Hunter feel the staff vs. leader permission model.

import { createContext, useContext, useState, type ReactNode } from "react";
import type { AppRole } from "@/lib/types";

const RoleContext = createContext<{ role: AppRole; setRole: (r: AppRole) => void }>({
  role: "staff",
  setRole: () => {},
});

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<AppRole>("staff");
  return <RoleContext.Provider value={{ role, setRole }}>{children}</RoleContext.Provider>;
}

export const useRole = () => useContext(RoleContext);
