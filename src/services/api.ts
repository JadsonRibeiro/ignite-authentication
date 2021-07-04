import axios, { AxiosError } from "axios";
import { parseCookies, setCookie } from "nookies";
import { signOut } from "../contexts/AuthContext";

type Request = {
    onSuccess: (token: string) => void;
    onFailure: (error: AxiosError) => void;
}

let cookies = parseCookies();
let failedRequestsQueue: Request[] = [];
let isRefreshing = false;

export const api = axios.create({
    baseURL: "http://localhost:3333",
    headers: {
        Authorization: `Bearer ${cookies['authrkst.token']}`
    }
});

api.interceptors.response.use(response => { 
    return response;
}, (error: AxiosError) => {
    if(error.response?.status === 401) {
        if(error.response.data?.code === 'token.expired') {
            cookies = parseCookies();

            const { 'authrkst.refreshToken': refreshToken } = cookies;
            let originalConfig = error.config;

            if(!isRefreshing) {
                isRefreshing = true;
                api.post('/refresh', { refreshToken })
                    .then(response => {
                        
                        setCookie(undefined, 'authrkst.token', response.data.token, {
                            maxAge: 60 * 60 * 24 * 30,
                            path: '/'
                        });
            
                        setCookie(undefined, 'authrkst.refreshToken', response.data.refreshToken, {
                            maxAge: 60 * 60 * 24 * 30,
                            path: '/'
                        });
        
                        api.defaults.headers['Authorization'] = `Bearer ${response.data.token}`;

                        failedRequestsQueue.forEach(request => request.onSuccess(response.data.token));
                        failedRequestsQueue = [];
                    })
                    .catch((error) => {
                        failedRequestsQueue.forEach(request => request.onFailure(error));
                        failedRequestsQueue = [];
                    })
                    .finally(() => {
                        isRefreshing = false;
                    });
            }

            return new Promise((resolve, reject) => {
                failedRequestsQueue.push({
                    onSuccess: (token: string) => {
                        console.log('Refazendo requisição', token);
                        originalConfig.headers['Authorization'] = `Bearer ${token}`;

                        resolve(api(originalConfig));
                    },
                    onFailure: (error: AxiosError) => {
                        reject(error);
                    }
                })
            })
        } else {
            signOut();
        }
    }

    // Passa o erro adiante para que a aplicação possa tratá-lo da melhor forma
    return Promise.reject(error);
})