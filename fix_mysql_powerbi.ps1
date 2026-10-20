# Script de Diagnóstico e Configuração do MySQL para o Power BI Desktop
# Padaria Diniz Analytics

Write-Host "=== Verificação do Ambiente MySQL para Power BI ===" -ForegroundColor Cyan

# 1. Verificar serviço MySQL
$service = Get-Service -Name "MySQL80" -ErrorAction SilentlyContinue
if ($service -and $service.Status -eq 'Running') {
    Write-Host "[OK] Serviço MySQL80 está rodando." -ForegroundColor Green
} else {
    Write-Host "[AVISO] Serviço MySQL80 não está rodando. Inicie o serviço com: Start-Service MySQL80" -ForegroundColor Yellow
}

# 2. Verificar versão do Connector/NET
$connector = Get-Package -Name "*MySQL Connector/NET*" -ErrorAction SilentlyContinue
if ($connector) {
    Write-Host "[INFO] Versão do MySQL Connector/NET instalada: $($connector.Version)" -ForegroundColor Cyan
    if ($connector.Version -like "9.*" -or [version]$connector.Version -ge [version]"8.1.0") {
        Write-Host "⚠️ ATENÇÃO:" -ForegroundColor Yellow
        Write-Host "O Power BI Desktop tem incompatibilidade conhecida com o Connector/NET 9.x ou 8.1+." -ForegroundColor Yellow
        Write-Host "Caso o Power BI exiba o erro 'Este conector requer um ou mais componentes adicionais':" -ForegroundColor White
        Write-Host "1. Desinstale o MySQL Connector/NET $($connector.Version) no Painel de Controle." -ForegroundColor White
        Write-Host "2. Baixe e instale o MySQL Connector/NET 8.0.32 ou 8.0.28:" -ForegroundColor White
        Write-Host "   https://downloads.mysql.com/archives/c-net/" -ForegroundColor Cyan
    }
} else {
    Write-Host "[ERRO] MySQL Connector/NET não encontrado!" -ForegroundColor Red
    Write-Host "Baixe em: https://downloads.mysql.com/archives/c-net/ (Versão recomendada: 8.0.32)" -ForegroundColor Yellow
}

Write-Host "`n=== Credenciais para Conexão no Power BI ===" -ForegroundColor Cyan
Write-Host "Servidor:  localhost" -ForegroundColor White
Write-Host "Banco:     padaria" -ForegroundColor White
Write-Host "Usuário:   root" -ForegroundColor White
Write-Host "Views:     vw_fato_vendas, vw_dim_produtos, vw_dim_setor, vw_dim_clientes" -ForegroundColor White
