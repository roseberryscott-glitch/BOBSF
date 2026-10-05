import { reviewEvent } from "./actions";

// Approve or decline a member's event suggestion (admins only).
export function ReviewButtons({ id, back }: { id: string; back?: "admin" }) {
  return (
    <div className="flex flex-wrap items-end gap-3 border-t border-border pt-4">
      <form action={reviewEvent.bind(null, id, true)}>
        {back && <input type="hidden" name="back" value={back} />}
        <button className="btn btn-small">Approve</button>
      </form>
      <form action={reviewEvent.bind(null, id, false)} className="flex flex-wrap items-end gap-2">
        {back && <input type="hidden" name="back" value={back} />}
        <input className="input w-60 py-1.5 text-base" name="reason" placeholder="Reason (optional)" aria-label="Reason for declining" />
        <button className="btn-secondary btn-small">Decline</button>
      </form>
    </div>
  );
}
