"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

export interface OutgoingCallState {
  inviteId: string;
  roomId: string;
  targetUid: string;
  targetName: string;
}

interface CallContextValue {
  outgoingCall: OutgoingCallState | null;
  startOutgoingCall: (state: OutgoingCallState) => void;
  clearOutgoingCall: () => void;
}

const CallContext = createContext<CallContextValue | undefined>(undefined);

export function CallProvider({ children }: { children: ReactNode }) {
  const [outgoingCall, setOutgoingCall] = useState<OutgoingCallState | null>(null);

  return (
    <CallContext.Provider
      value={{
        outgoingCall,
        startOutgoingCall: setOutgoingCall,
        clearOutgoingCall: () => setOutgoingCall(null),
      }}
    >
      {children}
    </CallContext.Provider>
  );
}

export function useCall() {
  const context = useContext(CallContext);
  if (!context) throw new Error("useCall must be used within CallProvider");
  return context;
}
