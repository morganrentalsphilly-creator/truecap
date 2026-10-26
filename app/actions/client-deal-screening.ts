"use server";
import { z } from "zod";
import { screenDealForClients, type ClientDealScreen } from "@/lib/client-deal-screening";
import { loadClientUnderwritingContext, clientMatchFingerprint } from "@/lib/client-underwriting-server";
import { TRUECAP_UNDERWRITING_STANDARD_VERSION } from "@/lib/underwriting-methodology";
export type ClientDealScreeningResult =
  | { ok: true; screens: (ClientDealScreen & { sourceFingerprint: string | null })[]; calculatedAt: string; methodologyVersion: string }
  | { ok: false; message: string };
export async function screenSavedDealForClientsAction(input: unknown): Promise<ClientDealScreeningResult> {
  const parsed = z.object({ savedDealId: z.string().uuid() }).strict().safeParse(input);
  if (!parsed.success) return { ok: false, message: "Choose a saved deal to screen." };
  const context = await loadClientUnderwritingContext(parsed.data.savedDealId);
  if (!context.ok) return context;
  const { values, clients, boxes } = context;
  return {
    ok: true,
    screens: screenDealForClients(values, clients, boxes).map(screen => {
      const client = clients.find(client => client.id === screen.clientId);
      const box = boxes.find(box => box.id === screen.buyBoxId);
      return { ...screen, sourceFingerprint: client && box ? clientMatchFingerprint(values, client, box) : null };
    }),
    calculatedAt: new Date().toISOString(), methodologyVersion: TRUECAP_UNDERWRITING_STANDARD_VERSION,
  };
}
