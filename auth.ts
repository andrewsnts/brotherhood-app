import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import NeonAdapter from "@auth/neon-adapter";
import { Pool } from "@neondatabase/serverless";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      memberId: string | null;
      groupId: string | null;
    };
  }
}

// Use a module-level pool (reused across requests in serverless)
const pool = new Pool({ connectionString: process.env.DATABASE_URL! });

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: NeonAdapter(pool),
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  session: { strategy: "database" },
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      session.user.memberId = (user as { member_id?: string | null }).member_id ?? null;
      session.user.groupId = (user as { group_id?: string | null }).group_id ?? null;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
