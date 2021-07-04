import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { destroyCookie, parseCookies, setCookie } from "nookies";
import Router from "next/router";
import { api } from "../services/api";

type SignInCredentials = {
    email: string;
    password: string;
}

type AuthContextData = {
    signIn(credentials: SignInCredentials): Promise<void>;
    isAuthenticated: boolean;
    user: User | undefined;
}

type User = {
    email: string;
    permissions: string[];
    roles: string[];
}

const AuthContext = createContext({} as AuthContextData);

type AuthProviderProsp = {
    children: ReactNode;
}

export function signOut() {
    destroyCookie(undefined, 'authrkst.token')
    destroyCookie(undefined, 'authrkst.refreshToken');

    Router.push('/');
}

export function AuthProvider({ children }: AuthProviderProsp) {
    const [user, setUser] = useState<User>();
    const isAuthenticated = !!user;

    useEffect(() => {
        const { 'authrkst.token': token } = parseCookies();

        if(token) {
            api.get('/me')
                .then(response => {
                    const { email, permissions, roles } = response.data;

                    setUser({ email, permissions, roles });
                }).catch(() => {
                    // Se algum error for disparado aqui, será algo relacionado a qualquer coisa
                    // que não seja erro de token expirado, pois será tratado em api.ts
                    // Por isso, é necessário deslogar o usuário

                    signOut();
                });
        }
    }, []);

    async function signIn(credentials: SignInCredentials) {
        try {
            const response = await api.post('sessions', credentials);
            
            const { permissions, roles, token, refreshToken } = response.data;

            setCookie(undefined, 'authrkst.token', token, {
                maxAge: 60 * 60 * 24 * 30, // 30 days (Backend é o responsável por atualizar o cookie quando necessário)
                path: '/'
            });

            setCookie(undefined, 'authrkst.refreshToken', refreshToken, {
                maxAge: 60 * 60 * 24 * 30,
                path: '/'
            });

            // Observação
            // Melhor do que salvar email, nome, permissões, etc no cookie, é salvar só o token
            // e utilizá-lo para sempre que o usuário voltar, recuperar as informações dele novamente

            setUser({
                email: credentials.email,
                permissions,
                roles
            });

            api.defaults.headers['Authorization'] = `Bearer ${token}`;

            Router.push('/dashboard');
        } catch(e) {
            console.log('Sign In error', e);
        }
    }

    return (
        <AuthContext.Provider value={{ isAuthenticated, signIn, user }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    return useContext(AuthContext);
}
