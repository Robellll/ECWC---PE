import { roleLabel } from './permissions.js';

/** Edge-safe Auth.js config (no DB/bcrypt — used by middleware). */
export const authConfig = {
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  pages: { signIn: '/login', signOut: '/login' },
  session: { strategy: 'jwt' },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.projectId = user.projectId;
        token.roleLabel = roleLabel(user.role);
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.roleLabel = token.roleLabel;
        session.user.projectId = token.projectId;
      }
      return session;
    },
  },
};
