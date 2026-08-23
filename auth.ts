import NextAuth from "next-auth"
import GitHub from "next-auth/providers/github"

declare module "next-auth" {
  interface Session {
    /** The user's own GitHub token — used to ask GitHub what they may see. */
    accessToken?: string
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [GitHub],
  callbacks: {
    // The token is only present on the sign-in call, so it has to be copied
    // into the JWT then; later calls just carry it forward.
    //
    // Nothing else is cached here on purpose: Next forbids setting cookies
    // during a Server Component render, so token changes made while rendering
    // are discarded. Caching lives in lib/access.ts instead.
    jwt({ token, account }) {
      if (account?.access_token) token.accessToken = account.access_token
      return token
    },
    session({ session, token }) {
      // JWT is a Record<string, unknown>, so this reads back as unknown. The
      // narrowing is safe because the callback above is the only writer.
      session.accessToken = token.accessToken as string | undefined
      return session
    },
  },
})
