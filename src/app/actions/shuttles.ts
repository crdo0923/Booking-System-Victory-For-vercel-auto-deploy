"use server";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { createShuttle, reviewShuttle } from "@/lib/services/shuttles";
export async function requestShuttleAction(formData: FormData): Promise<void> {
  const dates=String(formData.get("dates")||"").split(",").map(x=>x.trim()).filter(Boolean);
  const result=await createShuttle({dates,origin:formData.get("origin"),destination:formData.get("destination"),departureTime:formData.get("departureTime"),arrivalTime:String(formData.get("arrivalTime")||"")||null,passengerCount:formData.get("passengerCount"),purpose:formData.get("purpose"),estimatedGas:formData.get("estimatedGas") || 0,estimatedToll:formData.get("estimatedToll") || 0,estimatedOther:formData.get("estimatedOther") || 0},await getCurrentUser(),await getRepository());
  if (!result.ok) throw new Error(result.error);
  revalidatePath("/shuttles");
  revalidatePath("/admin/shuttles");
}
export async function reviewShuttleAction(formData: FormData): Promise<void> {
  const result=await reviewShuttle({id:String(formData.get("id")),status:String(formData.get("status")),denialReason:String(formData.get("denialReason")||""),driverId:String(formData.get("driverId")||""),finalGas:formData.get("finalGas"),finalToll:formData.get("finalToll"),finalOther:formData.get("finalOther")},await getCurrentUser(),await getRepository());
  if (!result.ok) throw new Error(result.error);
  revalidatePath("/admin/shuttles");
  revalidatePath("/shuttles");
}
