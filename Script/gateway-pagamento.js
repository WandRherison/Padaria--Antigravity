// ============================================================================
// SIMULADOR DE GATEWAYS DE PAGAMENTO (PIX & CARTÃO CRÉDITO / DÉBITO)
// Padaria Diniz - Pagamento Online Simulado
// ============================================================================

(function () {
    let timerPixInterval = null;

    function formatarMoedaBR(valor) {
        return 'R$ ' + Number(valor || 0).toFixed(2).replace('.', ',');
    }

    function detectarBandeira(numeroLimpo) {
        if (/^4/.test(numeroLimpo)) return 'Visa';
        if (/^(5[1-5]|2[2-7])/.test(numeroLimpo)) return 'Mastercard';
        if (/^(4011|4312|4389|4514|4576|5041|5066|509|6277|6362|6363|650|6516|6550)/.test(numeroLimpo)) return 'Elo';
        return 'Cartão';
    }

    function gerarSvgQrCodeSimulado(seedTexto) {
        const size = 21;
        let hash = 0;
        for (let i = 0; i < seedTexto.length; i++) {
            hash = ((hash << 5) - hash + seedTexto.charCodeAt(i)) | 0;
        }
        let rects = '';
        const isFinder = (r, c) =>
            (r < 7 && c < 7) ||
            (r < 7 && c >= size - 7) ||
            (r >= size - 7 && c < 7);

        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                let dark = false;
                if (isFinder(r, c)) {
                    const lr = r >= size - 7 ? r - (size - 7) : r;
                    const lc = c >= size - 7 ? c - (size - 7) : c;
                    dark =
                        lr === 0 || lr === 6 || lc === 0 || lc === 6 ||
                        (lr >= 2 && lr <= 4 && lc >= 2 && lc <= 4);
                } else {
                    const v = Math.abs(Math.sin(hash + r * 31 + c * 17) * 10000);
                    dark = Math.floor(v) % 2 === 0;
                }
                if (dark) {
                    rects += `<rect x="${c}" y="${r}" width="1" height="1" fill="#1F1A17"/>`;
                }
            }
        }
        return `<svg viewBox="0 0 ${size} ${size}" width="180" height="180" shape-rendering="crispEdges" aria-label="QR Code Pix Simulado">${rects}</svg>`;
    }

    function garantirContainerModal() {
        let overlay = document.getElementById('modal-gateway-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'modal-gateway-overlay';
            overlay.className = 'modal-overlay gateway-overlay';
            overlay.style.display = 'none';
            document.body.appendChild(overlay);
        }
        return overlay;
    }

    function fecharGatewayPagamento() {
        if (timerPixInterval) {
            clearInterval(timerPixInterval);
            timerPixInterval = null;
        }
        const overlay = document.getElementById('modal-gateway-overlay');
        if (overlay) {
            overlay.style.display = 'none';
            overlay.innerHTML = '';
        }
        document.body.style.overflow = '';
    }

    function abrirGatewayPix(overlay, { valorTotal, totalItens, onAprovado }) {
        const txId = 'DINIZPIX' + Date.now().toString().slice(-8);
        const codigoCopiaCola = `00020126580014BR.GOV.BCB.PIX0136padariadiniz@pix.simulado.br5204000053039865406${Number(valorTotal).toFixed(2)}5802BR5913PADARIA DINIZ6010HORTOLANDIA62120508${txId}6304A1B2`;
        const qrSvg = gerarSvgQrCodeSimulado(txId + valorTotal);

        overlay.innerHTML = `
            <div class="modal-box gateway-box" role="dialog" aria-modal="true" aria-labelledby="gw-pix-titulo">
                <div class="gateway-header">
                    <span class="gateway-badge pix">PIX INSTANTÂNEO</span>
                    <button type="button" class="gateway-close" id="gw-btn-fechar" aria-label="Fechar pagamento">✖</button>
                </div>
                <h2 id="gw-pix-titulo">Pague com Pix</h2>
                <p class="gateway-subtitulo">${totalItens} un &bull; Total: <strong>${formatarMoedaBR(valorTotal)}</strong></p>

                <div class="pix-qr-wrapper">${qrSvg}</div>

                <p class="pix-timer">Expira em: <strong id="pix-countdown">05:00</strong></p>

                <div class="pix-copia-cola">
                    <label for="pix-chave-input">Pix Copia e Cola (Simulação):</label>
                    <div class="pix-input-row">
                        <input id="pix-chave-input" type="text" readonly value="${codigoCopiaCola}">
                        <button type="button" id="gw-btn-copiar">Copiar</button>
                    </div>
                </div>

                <div id="gw-status-msg" class="gateway-status" aria-live="polite"></div>

                <div class="gateway-actions">
                    <button type="button" class="btn-comprar-tudo" id="gw-btn-confirmar-pix">Simular Pagamento Confirmado</button>
                    <button type="button" class="btn-voltar-compras" id="gw-btn-cancelar">Cancelar</button>
                </div>
            </div>
        `;

        overlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';

        let segundos = 300;
        const countdownEl = document.getElementById('pix-countdown');
        timerPixInterval = setInterval(() => {
            segundos--;
            if (segundos <= 0) {
                clearInterval(timerPixInterval);
                countdownEl.textContent = '00:00';
                return;
            }
            const min = String(Math.floor(segundos / 60)).padStart(2, '0');
            const sec = String(segundos % 60).padStart(2, '0');
            countdownEl.textContent = `${min}:${sec}`;
        }, 1000);

        document.getElementById('gw-btn-fechar').onclick = fecharGatewayPagamento;
        document.getElementById('gw-btn-cancelar').onclick = fecharGatewayPagamento;

        document.getElementById('gw-btn-copiar').onclick = async () => {
            const input = document.getElementById('pix-chave-input');
            try {
                await navigator.clipboard.writeText(input.value);
            } catch (_) {
                input.select();
                document.execCommand('copy');
            }
            const btn = document.getElementById('gw-btn-copiar');
            btn.textContent = 'Copiado!';
            setTimeout(() => (btn.textContent = 'Copiar'), 2000);
        };

        document.getElementById('gw-btn-confirmar-pix').onclick = () => {
            const btn = document.getElementById('gw-btn-confirmar-pix');
            const status = document.getElementById('gw-status-msg');
            btn.disabled = true;
            btn.textContent = '⏳ Confirmando Pix...';
            status.className = 'gateway-status info';
            status.textContent = 'Verificando compensação instantânea...';

            setTimeout(() => {
                status.className = 'gateway-status sucesso';
                status.textContent = '✅ Pagamento Pix aprovado! Registrando pedido...';
                setTimeout(() => {
                    fecharGatewayPagamento();
                    onAprovado({ transacaoId: txId, metodo: 'Pix' });
                }, 600);
            }, 900);
        };
    }

    function abrirGatewayCartao(overlay, { metodo, valorTotal, totalItens, onAprovado }) {
        const isCredito = metodo === 'Cartão de Crédito';
        const opcoesParcelas = isCredito
            ? `
                <div class="gateway-field">
                    <label for="gw-parcelas">Parcelamento</label>
                    <select id="gw-parcelas">
                        <option value="1">1x de ${formatarMoedaBR(valorTotal)} (à vista)</option>
                        <option value="2">2x de ${formatarMoedaBR(valorTotal / 2)} sem juros</option>
                        <option value="3">3x de ${formatarMoedaBR(valorTotal / 3)} sem juros</option>
                    </select>
                </div>`
            : '';

        overlay.innerHTML = `
            <div class="modal-box gateway-box" role="dialog" aria-modal="true" aria-labelledby="gw-cartao-titulo">
                <div class="gateway-header">
                    <span class="gateway-badge cartao">${metodo.toUpperCase()}</span>
                    <button type="button" class="gateway-close" id="gw-btn-fechar" aria-label="Fechar pagamento">✖</button>
                </div>
                <h2 id="gw-cartao-titulo">Dados do ${metodo}</h2>
                <p class="gateway-subtitulo">${totalItens} un &bull; Total: <strong>${formatarMoedaBR(valorTotal)}</strong></p>

                <form id="gw-form-cartao" class="gateway-form" novalidate>
                    <div class="gateway-field">
                        <div class="gateway-label-row">
                            <label for="gw-numero">Número do Cartão</label>
                            <span id="gw-bandeira" class="gateway-bandeira">Cartão</span>
                        </div>
                        <input id="gw-numero" type="text" inputmode="numeric" maxlength="19" placeholder="0000 0000 0000 0000" required>
                    </div>

                    <div class="gateway-field">
                        <label for="gw-titular">Nome Impresso no Cartão</label>
                        <input id="gw-titular" type="text" placeholder="NOME COMPLETO" required>
                    </div>

                    <div class="gateway-row-2">
                        <div class="gateway-field">
                            <label for="gw-validade">Validade</label>
                            <input id="gw-validade" type="text" inputmode="numeric" maxlength="5" placeholder="MM/AA" required>
                        </div>
                        <div class="gateway-field">
                            <label for="gw-cvv">CVV</label>
                            <input id="gw-cvv" type="password" inputmode="numeric" maxlength="4" placeholder="123" required>
                        </div>
                    </div>

                    ${opcoesParcelas}

                    <button type="button" class="gw-btn-teste" id="gw-btn-preencher-teste">⚡ Preencher cartão de teste</button>
                    <p class="gw-dica-teste">Dica: cartões terminados em <code>0000</code> simulam recusa.</p>

                    <div id="gw-status-msg" class="gateway-status" aria-live="polite"></div>

                    <div class="gateway-actions">
                        <button type="submit" class="btn-comprar-tudo" id="gw-btn-pagar">Pagar ${formatarMoedaBR(valorTotal)}</button>
                        <button type="button" class="btn-voltar-compras" id="gw-btn-cancelar">Cancelar</button>
                    </div>
                </form>
            </div>
        `;

        overlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';

        const inputNum = document.getElementById('gw-numero');
        const inputVal = document.getElementById('gw-validade');
        const inputCvv = document.getElementById('gw-cvv');
        const inputTit = document.getElementById('gw-titular');
        const bandeiraEl = document.getElementById('gw-bandeira');

        inputNum.addEventListener('input', () => {
            const digits = inputNum.value.replace(/\D/g, '').slice(0, 16);
            inputNum.value = digits.replace(/(\d{4})(?=\d)/g, '$1 ');
            bandeiraEl.textContent = detectarBandeira(digits);
        });

        inputVal.addEventListener('input', () => {
            const digits = inputVal.value.replace(/\D/g, '').slice(0, 4);
            inputVal.value = digits.length >= 3 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
        });

        inputCvv.addEventListener('input', () => {
            inputCvv.value = inputCvv.value.replace(/\D/g, '').slice(0, 4);
        });

        document.getElementById('gw-btn-preencher-teste').onclick = () => {
            inputNum.value = '4532 1188 7766 4242';
            bandeiraEl.textContent = 'Visa';
            inputTit.value = (localStorage.getItem('nomeUsuario') || 'CLIENTE PADARIA DINIZ').toUpperCase();
            inputVal.value = '12/29';
            inputCvv.value = '321';
        };

        document.getElementById('gw-btn-fechar').onclick = fecharGatewayPagamento;
        document.getElementById('gw-btn-cancelar').onclick = fecharGatewayPagamento;

        document.getElementById('gw-form-cartao').onsubmit = (e) => {
            e.preventDefault();
            const numLimpo = inputNum.value.replace(/\D/g, '');
            const status = document.getElementById('gw-status-msg');
            const btnPagar = document.getElementById('gw-btn-pagar');

            if (numLimpo.length < 13 || !inputTit.value.trim() || inputVal.value.length < 5 || inputCvv.value.length < 3) {
                status.className = 'gateway-status erro';
                status.textContent = 'Preencha corretamente os dados do cartão.';
                return;
            }

            btnPagar.disabled = true;
            btnPagar.textContent = '⏳ Autorizando...';
            status.className = 'gateway-status info';
            status.textContent = 'Comunicando com a operadora (simulação)...';

            setTimeout(() => {
                if (numLimpo.endsWith('0000')) {
                    btnPagar.disabled = false;
                    btnPagar.textContent = `Pagar ${formatarMoedaBR(valorTotal)}`;
                    status.className = 'gateway-status erro';
                    status.textContent = '❌ Transação recusada pela operadora simulada. Tente outro cartão.';
                    return;
                }
                const txId = 'CARD' + Date.now().toString().slice(-8);
                status.className = 'gateway-status sucesso';
                status.textContent = '✅ Pagamento aprovado! Finalizando pedido...';
                setTimeout(() => {
                    fecharGatewayPagamento();
                    onAprovado({ transacaoId: txId, metodo });
                }, 600);
            }, 1000);
        };
    }

    window.abrirGatewayPagamento = function ({ metodo, valorTotal, totalItens, onAprovado }) {
        const overlay = garantirContainerModal();
        if (metodo === 'Pix') {
            abrirGatewayPix(overlay, { valorTotal, totalItens, onAprovado });
        } else {
            abrirGatewayCartao(overlay, { metodo, valorTotal, totalItens, onAprovado });
        }
    };
})();
