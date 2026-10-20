/* =======================================================
   VALIDAÇÃO E REDEFINIÇÃO REAL DE SENHA VIA API
======================================================= */
function iniciarRedefinicaoSenha() {
    const form = document.querySelector('.form-esqueceu');
    const msgStatus = document.getElementById('mensagem-status');
    const btnSubmit = document.querySelector('.btn-salvar');

    // Suporta Render (produção), file://, Live Server (porta 5500) ou Node (porta 3000)
    const API_BASE = (window.location.protocol === 'file:' || ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && window.location.port !== '3000' && window.location.port !== ''))
        ? 'http://localhost:3000'
        : '';

    function exibirMensagem(texto, isErro = false) {
        if (msgStatus) {
            msgStatus.style.display = 'block';
            msgStatus.style.backgroundColor = isErro ? '#fee2e2' : '#dcfce7';
            msgStatus.style.color = isErro ? '#b91c1c' : '#15803d';
            msgStatus.style.border = isErro ? '1px solid #fecaca' : '1px solid #bbf7d0';
            msgStatus.innerText = texto;
        }
        if (typeof mostrarToast === 'function') {
            mostrarToast(texto);
        } else if (isErro && !msgStatus) {
            alert(texto);
        }
    }

    async function processarRedefinicao(event) {
        if (event) event.preventDefault();

        const inputEmail = document.getElementById('email');
        const inputSenha = document.getElementById('senha');
        const inputConfirmar = document.getElementById('confirmar-senha');

        const email = inputEmail ? inputEmail.value.trim().toLowerCase() : '';
        const senha = inputSenha ? inputSenha.value.trim() : '';
        const confirmarSenha = inputConfirmar ? inputConfirmar.value.trim() : '';

        if (!email) {
            exibirMensagem('Informe o seu e-mail cadastrado.', true);
            return;
        }

        if (senha.length < 8) {
            exibirMensagem('A nova senha deve ter no mínimo 8 caracteres.', true);
            return;
        }

        if (senha !== confirmarSenha) {
            exibirMensagem('As senhas digitadas não coincidem. Verifique novamente.', true);
            return;
        }

        // Feedback de carregamento
        const textoOriginal = btnSubmit ? btnSubmit.innerText : 'Salvar Nova Senha';
        if (btnSubmit) {
            btnSubmit.disabled = true;
            btnSubmit.innerText = '⏳ Salvando no banco...';
            btnSubmit.style.cursor = 'not-allowed';
        }
        exibirMensagem('⏳ Conectando ao banco de dados...', false);

        try {
            const resposta = await fetch(`${API_BASE}/api/redefinir-senha`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email, novaSenha: senha })
            });

            const dados = await resposta.json();

            if (!resposta.ok) {
                throw new Error(dados.erro || 'Falha ao redefinir a senha.');
            }

            // Limpa qualquer sessão anterior do localStorage
            localStorage.removeItem('usuarioLogado');
            localStorage.removeItem('emailUsuario');
            localStorage.removeItem('tipoUsuario');

            exibirMensagem('✅ Senha alterada com sucesso! Redirecionando para o login...', false);

            setTimeout(() => {
                window.location.href = 'padaria-login.html';
            }, 2000);

        } catch (erro) {
            console.error("Erro ao redefinir senha:", erro);
            let msgAmigavel = erro.message;
            if (erro.message.includes('Failed to fetch') || erro.message.includes('NetworkError')) {
                msgAmigavel = 'Não foi possível conectar ao servidor. Certifique-se de que o backend Node.js está rodando na porta 3000.';
            }
            exibirMensagem('❌ ' + msgAmigavel, true);

            if (btnSubmit) {
                btnSubmit.disabled = false;
                btnSubmit.innerText = textoOriginal;
                btnSubmit.style.cursor = 'pointer';
            }
        }
    }

    if (form) {
        form.addEventListener('submit', processarRedefinicao);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciarRedefinicaoSenha);
} else {
    iniciarRedefinicaoSenha();
}
