import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { sql } from './db.js';
import { roleLabel } from './permissions.js';
import { authConfig } from './auth.config.js';
import { logUserLogin } from './audit-log.js';

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const rows = await sql`
          SELECT id, email, password_hash, name, role, project_id
          FROM users WHERE email = ${credentials.email}
        `;
        const user = rows[0];
        if (!user) return null;

        const valid = await bcrypt.compare(credentials.password, user.password_hash);
        if (!valid) return null;

        await logUserLogin({
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          projectId: user.project_id,
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          projectId: user.project_id,
          roleLabel: roleLabel(user.role),
        };
      },
    }),
  ],
});
