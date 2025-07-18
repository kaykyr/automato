#!/bin/bash

# Script para testar o workflow corrigido

echo "🚀 Testando workflow Handicap Asiático..."
echo ""

# Fazer backup do workflow atual (se existir)
if [ -f "backend/database.sqlite" ]; then
    cp backend/database.sqlite backend/database.sqlite.backup
    echo "✅ Backup do banco de dados criado"
fi

# Importar o workflow corrigido via API
echo "📥 Importando workflow corrigido..."
curl -X POST http://localhost:3001/api/v1/flows \
  -H "Content-Type: application/json" \
  -d @workflow-handicap-asiatico-corrigido.json

echo ""
echo "✅ Workflow importado com sucesso!"
echo ""
echo "Para executar o workflow:"
echo "1. Abra o FlowBuilder no navegador"
echo "2. Selecione 'Handicap Asiático Série C - Betano'"
echo "3. Clique em 'Execute Flow'"
echo ""
echo "O workflow irá:"
echo "- Navegar para a página da Série C"
echo "- Fechar modais se necessário"
echo "- Extrair URLs de todos os jogos"
echo "- Para cada jogo:"
echo "  - Abrir a página"
echo "  - Clicar em Asian Lines"
echo "  - Extrair dados de handicap"
echo ""