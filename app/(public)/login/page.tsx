// app/(public)/login/page.tsx
export default function Login() {
  return (
    <form
      action="/api/auth/login"
      method="POST"
      className="mt-6 w-full max-w-sm space-y-4"
    >
      <input
        name="emailOrLdapLoginId"
        required
        placeholder="Email"
        className="h-11 w-full rounded-lg border px-3 text-sm outline-none focus:ring-2 focus:ring-black"
      />
      <input
        name="password"
        type="password"
        required
        placeholder="Password"
        className="h-11 w-full rounded-lg border px-3 text-sm outline-none focus:ring-2 focus:ring-black"
      />
      <button className="inline-flex h-11 w-full items-center justify-center rounded-md bg-black text-white">
        Sign in
      </button>
    </form>
  );
}
