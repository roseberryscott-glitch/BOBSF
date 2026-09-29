// Shows ?error= and ?message= from a redirect, so forms work without JavaScript.
export function Messages({ error, message }: { error?: string | string[]; message?: string | string[] }) {
  const e = Array.isArray(error) ? error[0] : error;
  const m = Array.isArray(message) ? message[0] : message;
  return (
    <>
      {e && (
        <p role="alert" className="error mb-6">
          {e}
        </p>
      )}
      {m && (
        <p role="status" className="notice mb-6">
          {m}
        </p>
      )}
    </>
  );
}
