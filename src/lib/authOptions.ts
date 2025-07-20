import { AuthOptions } from "next-auth";
import Google from "next-auth/providers/google";
import { supabase } from "./supabase";

export const authOptions: AuthOptions = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        try {
          // Check if user exists
          const { data: existingUser } = await supabase
            .from('users')
            .select('*')
            .eq('email', user.email)
            .single();

          // If user doesn't exist, create one
          if (!existingUser && profile?.email) {
            const { data: newUser, error } = await supabase
              .from('users')
              .insert({
                email: profile.email,
                name: profile.name || "Unknown",
                email_verified: new Date().toISOString(),
                image: profile.picture || null,
                online: false,
                prefix: null,
              })
              .select()
              .single();

            if (error) throw error;

            // Create account record
            await supabase.from('accounts').insert({
              user_id: newUser.id,
              type: 'oauth',
              provider: account.provider,
              provider_account_id: account.providerAccountId || '',
              refresh_token: account.refresh_token || null,
              access_token: account.access_token || null,
              expires_at: account.expires_at || null,
              token_type: account.token_type || null,
              scope: account.scope || null,
              id_token: account.id_token || null,
              session_state: account.session_state || null,
              online: false,
              prefix: null,
            });
          }

          return true;
        } catch (error) {
          console.error("Error in Google sign in:", error);
          return false;
        }
      }
      return true;
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
      }
      return token;
    },
  },
  pages: {
    signIn: "/login",
  },
};
