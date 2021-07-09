import React, { useEffect } from "react";
import { Can } from "../components/Can";
import { useAuth } from "../contexts/AuthContext"
import { setupAPIClient } from "../services/api";
import { api } from "../services/apiClient";
import { withSSRAuth } from "../utils/withSSRAuth";

export default function Dashboard() {
    const { user, signOut } = useAuth();

    useEffect(() => {
        api.get('me')
            .then(response => console.log(response))
            .catch(error => console.log(error));
    }, [])

    return (
        <>
            <h1>Dashboard {user?.email}</h1>

            <button onClick={signOut}>Sair</button>

            <Can permissions={['metrics.list']}>
                Métricas
            </Can>
        </>
    )
}

export const getServerSideProps = withSSRAuth(async (ctx) => {
    const apiClient = setupAPIClient(ctx);
    const response = await apiClient.get('/me');

    console.log(response.data);

    return {
        props: {}
    }
})