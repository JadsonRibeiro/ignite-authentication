import { GetServerSideProps, GetServerSidePropsContext, GetServerSidePropsResult } from "next";
import { destroyCookie, parseCookies } from "nookies";

import { AuthTokenError } from "../services/errors/AuthTokenError";

export function withSSRAuth<P>(fn: GetServerSideProps<P>) {
  return async (ctx: GetServerSidePropsContext): Promise<GetServerSidePropsResult<P> | undefined> => {
    const cookies = parseCookies(ctx);

    if(!cookies['authrkst.token']) {
      return {
        redirect: {
          destination: '/',
          permanent: false
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