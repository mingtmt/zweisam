"use client";

import { useEffect, useState } from "react";
import { onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { coupleCol, type CoupleCollection } from "@/lib/couple";

interface State<T> {
  key: string | null;
  items: T[];
  error: Error | null;
  loaded: boolean;
}

/** Live list of a couple subcollection via onSnapshot. */
export function useCoupleCollection<T extends { id?: string }>(
  coupleId: string | null | undefined,
  name: CoupleCollection
) {
  const key = coupleId ? `${coupleId}/${name}` : null;
  const [state, setState] = useState<State<T>>({
    key: null,
    items: [],
    error: null,
    loaded: false,
  });

  useEffect(() => {
    if (!coupleId || !key) return;
    return onSnapshot(
      coupleCol(db, coupleId, name),
      (snap) =>
        setState({
          key,
          items: snap.docs.map((d) => ({ ...(d.data() as T), id: d.id })),
          error: null,
          loaded: true,
        }),
      (error) => {
        console.error(`Failed to listen to ${key}:`, error);
        setState((s) => ({ ...s, key, error, loaded: true }));
      }
    );
  }, [coupleId, name, key]);

  const current = state.key === key;
  return {
    items: current ? state.items : ([] as T[]),
    error: current ? state.error : null,
    loading: key !== null && !(current && state.loaded),
  };
}
