import { PrismaAdapter } from "@auth/prisma-adapter";
import { compare } from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "./prisma";
import { UserRole } from "@prisma/client";
import { DefaultSession } from "next-auth";

export const authOptions: NextAuthOptions = {
  // Use adapter with type assertion to handle compatibility issues
  adapter: PrismaAdapter(prisma) as any,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/auth/signin",
    signOut: "/auth/signout",
    error: "/auth/error",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email,
          },
        });

        if (!user || !user.password) {
          return null;
        }

        const isPasswordValid = await compare(credentials.password, user.password);

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          // Default new Google OAuth users to ADVERTISER role
          role: UserRole.ADVERTISER,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account, trigger }) {
      // Initial sign in
      if (user) {
        token.id = user.id;
        token.email = user.email as string;
        token.role = user.role;

        // Get user data with role-specific relations
        if (account?.provider !== "credentials") {
          const userData = await prisma.user.findUnique({
            where: { id: user.id },
            include: {
              advertiser: {
                select: { id: true, companyName: true },
              },
              partner: {
                select: { id: true, companyName: true },
              },
              admin: {
                select: { id: true, permissions: true },
              },
            },
          });

          if (userData) {
            token.roleData = {};

            if (userData.role === UserRole.ADVERTISER && userData.advertiser) {
              token.roleData.advertiser = userData.advertiser;
            } else if (userData.role === UserRole.PARTNER && userData.partner) {
              token.roleData.partner = userData.partner;
            } else if (userData.role === UserRole.ADMIN && userData.admin) {
              token.roleData.admin = userData.admin;
            }
          }
        }
      }

      // Handle role updates
      if (trigger === "update" && token.role) {
        // Refresh user data from database to get the latest role
        const latestUser = await prisma.user.findUnique({
          where: { id: token.id as string },
        });

        if (latestUser) {
          token.role = latestUser.role;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
        if (token.roleData) {
          session.user.roleData = token.roleData;
        }
      }
      return session;
    },
  },
  // Enforce HTTPS in production
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === "production" 
        ? `__Secure-next-auth.session-token`
        : `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === "production",
      },
    },
    callbackUrl: {
      name: process.env.NODE_ENV === "production"
        ? `__Secure-next-auth.callback-url`
        : `next-auth.callback-url`,
      options: {
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === "production",
      },
    },
    csrfToken: {
      name: process.env.NODE_ENV === "production"
        ? `__Secure-next-auth.csrf-token`
        : `next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
};

// Type declarations for NextAuth
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      roleData?: {
        advertiser?: {
          id: string;
          companyName: string;
        };
        partner?: {
          id: string;
          companyName: string;
        };
        admin?: {
          id: string;
          permissions: any;
        };
      };
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    email?: string;
    roleData?: {
      advertiser?: {
        id: string;
        companyName: string;
      };
      partner?: {
        id: string;
        companyName: string;
      };
      admin?: {
        id: string;
        permissions: any;
      };
    };
  }
} 