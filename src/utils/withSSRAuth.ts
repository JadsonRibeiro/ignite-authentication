import jwtDecode from "jwt-decode";
import { GetServerSideProps, GetServerSidePropsContext, GetServerSidePropsResult } from "next";
import { destroyCookie, parseCookies } from "nookies";

import { AuthTokenError } from "../services/errors/AuthTokenError";
import { validateUserPermission } from "./validateUserPermissions";

type WithSSRAuthOptionsParams = {
  permissions?: string[],
  roles?: string[]
}

export function withSSRAuth<P>(fn: GetServerSideProps<P>, options?: WithSSRAuthOptionsParams) {
  return async (ctx: GetServerSidePropsContext): Promise<GetServerSidePropsResult<P> | undefined> => {
    const cookies = parseCookies(ctx);
    const token = cookies['authrkst.token'];

    if(!token) {
      return {
        redirect: {
          destination: '/',
          permanent: false
        }
      }
    }

    if(options) {
      const { permissions, roles } = options;
      const user = jwtDecode<{permissions: string[], roles: string[]}>(token);

      const userHasValidPermissions = validateUserPermission({
        user, permissions, roles
      });

      if(!userHasValidPermissions) {
        return {
          redirect: {
            destination: '/dashboard',
            permanent: false
          }
        }
      }
    }

    try {
      return await fn(ctx);
    } catch(error) {
      if(error instanceof AuthTokenError) {
        destroyCookie(ctx, 'authrkst.token');
        destroyCookie(ctx, 'authrkst.refreshToken');

        return {
          redirect: {
            destination: '/',
            permanent: false
          }
        }
      }
    }
  }
}