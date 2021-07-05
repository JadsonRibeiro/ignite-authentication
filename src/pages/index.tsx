import { GetServerSideProps } from "next";
import { FormEvent, useState } from "react";
import { parseCookies } from "nookies";

import { useAuth } from "../contexts/AuthContext";
import { withSSRGuest } from "../utils/withSSRGuest";

export default function Home() {
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const data = {
      email, password
    }

    console.log(data);
    await signIn(data);
  }

  return (
    <form onSubmit={handleSubmit}>
      <input type="email" value={email} onChange={e => setEmail(e.target.value)} />
      <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
      <button type="submit">Entrar</button>
    </form>
  )
}

export const getServerSideProps: GetServerSideProps = withSSRGuest(async (ctx) => {
  return {
    props: {}
  }
})
