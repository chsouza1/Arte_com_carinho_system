import { auth } from "./js/auth.js";

export const login = async (email, password) => {
    try {
        // Criação da sessão (login)
        const user = await auth.createSession(email, password);
        console.log('Login efetuado com sucesso', user);
        return user;
    } catch (error) {
        // Exibindo erro caso o login falhe
        console.log('Usuário ou senha incorretos', error);
        alert('Usuário ou senha incorretos. Tente novamente. ' + error.message);
    }
}
