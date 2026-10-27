import { z } from "zod";
import type { SessionUser } from "@/lib/auth/provider";
import type { Repository } from "@/lib/data/repository";
import { failure, success, type ServiceResult } from "@/lib/services/result";
const schema=z.object({dates:z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).min(1),origin:z.string().trim().min(2).max(200),destination:z.string().trim().min(2).max(200),departureTime:z.string().regex(/^\d{2}:\d{2}$/),arrivalTime:z.string().regex(/^\d{2}:\d{2}$/).nullable(),passengerCount:z.coerce.number().int().min(1).max(200),purpose:z.string().trim().min(2).max(1000),estimatedGas:z.coerce.number().min(0),estimatedToll:z.coerce.number().min(0),estimatedOther:z.coerce.number().min(0)});
export async function createShuttle(raw:unknown, actor:SessionUser|null, repo:Repository):Promise<ServiceResult<{id:string}>> {
  if(!actor) return failure("unauthenticated","Please sign in."); if(actor.accessStatus!=="active") return failure("access_required","Your account doesn't have portal access.");
  const parsed=schema.safeParse(raw); if(!parsed.success) return failure("invalid","Please check the shuttle details.");
  try { const r=await repo.createShuttleRequest({...parsed.data,userId:actor.id}); return success({id:r.id},"Shuttle request submitted for review."); } catch { return failure("unknown","Unable to submit shuttle request."); }
}
export async function reviewShuttle(raw:unknown, actor:SessionUser|null, repo:Repository):Promise<ServiceResult> {
  if(!actor || actor.accessStatus!=="active" || actor.role!=="admin") return failure("forbidden","Only admins can review shuttle requests.");
  const data=raw as Record<string,unknown>; if(typeof data.id!=="string" || (data.status!=="approved"&&data.status!=="denied")) return failure("invalid","Invalid review.");
  if(data.status==="denied" && typeof data.denialReason!=="string") return failure("invalid","Enter a reason for denial.");
  const r=await repo.reviewShuttleRequest({id:data.id,status:data.status as "approved"|"denied",denialReason:data.denialReason as string|undefined,driverId:(data.driverId as string)||null,finalGas:Number(data.finalGas||0),finalToll:Number(data.finalToll||0),finalOther:Number(data.finalOther||0)});
  return r?success(undefined,`Shuttle request ${data.status}.`):failure("already_reviewed","This request was already reviewed.");
}
