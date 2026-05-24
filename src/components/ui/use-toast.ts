"use client";

import * as React from "react";

const TOAST_LIMIT = 5;
const TOAST_REMOVE_DELAY = 5000;

type ToastVariant = "default" | "destructive";

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
  open: boolean;
}

type Action =
  | { type: "ADD"; toast: Toast }
  | { type: "DISMISS"; id: string }
  | { type: "REMOVE"; id: string };

let count = 0;
function genId() { return `toast-${++count}`; }

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

function reducer(state: Toast[], action: Action): Toast[] {
  switch (action.type) {
    case "ADD":
      return [action.toast, ...state].slice(0, TOAST_LIMIT);
    case "DISMISS":
      return state.map((t) => t.id === action.id ? { ...t, open: false } : t);
    case "REMOVE":
      return state.filter((t) => t.id !== action.id);
    default:
      return state;
  }
}

const listeners: Array<(state: Toast[]) => void> = [];
let memoryState: Toast[] = [];

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action);
  listeners.forEach((l) => l(memoryState));
}

export function toast(props: Omit<Toast, "id" | "open">) {
  const id = genId();
  dispatch({ type: "ADD", toast: { ...props, id, open: true } });

  const timeout = setTimeout(() => {
    dispatch({ type: "DISMISS", id });
    setTimeout(() => dispatch({ type: "REMOVE", id }), 300);
  }, TOAST_REMOVE_DELAY);
  toastTimeouts.set(id, timeout);

  return id;
}

export function useToast() {
  const [state, setState] = React.useState(memoryState);
  React.useEffect(() => {
    listeners.push(setState);
    return () => { listeners.splice(listeners.indexOf(setState), 1); };
  }, []);
  return { toasts: state, toast, dismiss: (id: string) => dispatch({ type: "DISMISS", id }) };
}
