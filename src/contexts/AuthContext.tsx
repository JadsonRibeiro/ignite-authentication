import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { destroyCookie, parseCookies, setCookie } from "nookies";
import Router from "next/router";
import { api } from "../services/apiClient";

type SignInCredentials = {
    email: string;
    password: string;
}

type AuthContextData = {
    signIn(credentials: SignInCredentials): Promise<void>;
    signOut(): void;
    isAuthenticated: boolean;
    user: User | undefined;
}

type User = {
    email: string;
    permissions: string[];
    roles: string[];
}

let authChannel: BroadcastChannel;

const AuthContext = createContext({} as AuthContextData);

type AuthProviderProsp = {
    children: ReactNode;
}

export function signOut() {
    console.log('Sign Out called');

    destroyCookie(undefined, 'authrkst.token')
    destroyCookie(undefined, 'authrkst.refreshToken');

    Router.push('/');
    
    authChannel.postMessage('signOut');
}

export function AuthProvider({ children }: AuthProviderProsp) {
    const [user, setUser] = useState<User>();
    const isAuthenticated = !!user;

    useEffect(() => {
        authChannel = new BroadcastChannel('auth');

        authChannel.onmessage = message => {
            console.log('Message', message);
            switch (message.data) {
                case 'signOut':
                    Router.push('/');
                    break;
                case 'signIn':
                    Router.push('/dashboard');
                default:
                    break;
            }
        };
    }, []);

    useEffect(() => {
        const { 'authrkst.token': token } = parseCookies();

        if(token) {
            api.get('/me')
                .then(response => {
                    const { email, permissions, roles } = response.data;

                    setUser({ email, permissions, roles });
                }).catch((e) => {
                    // Se algum error for disparado aqui, será algo relacionado a qualquer coisa
                    // que não seja erro de token expirado, pois será tratado em api.ts
                    // Por isso, é necessário deslogar o usuário

                    console.log("Error on /me request", e);
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
            
            authChannel.postMessage('signIn');
        } catch(e) {
            console.log('Sign In error', e);
        }
    }

    return (
        <AuthContext.Provider value={{ isAuthenticated, signIn, signOut, user }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    return useContext(AuthContext);
}
