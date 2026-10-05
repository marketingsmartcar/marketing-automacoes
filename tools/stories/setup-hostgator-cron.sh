#!/bin/bash
# =============================================================================
# Setup do Stories Scheduler no HostGator (sh-pro44)
# Executa via SSH: ssh -p 2222 -i ~/.ssh/hostgator_key brpneu76@sh-pro44.hostgator.com.br
# =============================================================================
#
# O que este script faz:
# 1. Cria a pasta ~/marketing-automation no servidor
# 2. Copia os arquivos necessários para lá (via rsync/scp da máquina local)
# 3. Instala as dependências Node.js
# 4. Configura o cron para rodar às 8h BRT (11h UTC), Seg a Sáb
#
# ATENÇÃO: Rode da sua máquina local, não no servidor.
# =============================================================================

set -e

HOST="brpneu76@sh-pro44.hostgator.com.br"
PORT=2222
KEY="$HOME/.ssh/hostgator_key"
REMOTE_DIR="/home3/brpneu76/marketing-automation"
LOCAL_DIR="$(cd "$(dirname "$0")/../.." && pwd)"  # raiz do projeto

echo "=== 1. Criando pasta no HostGator ==="
ssh -p $PORT -i $KEY $HOST "mkdir -p $REMOTE_DIR/tools/stories $REMOTE_DIR/data"

echo "=== 2. Enviando arquivos do scheduler ==="
rsync -avz -e "ssh -p $PORT -i $KEY" \
  "$LOCAL_DIR/tools/stories/" \
  "$HOST:$REMOTE_DIR/tools/stories/"

rsync -avz -e "ssh -p $PORT -i $KEY" \
  "$LOCAL_DIR/package.json" \
  "$LOCAL_DIR/package-lock.json" \
  "$LOCAL_DIR/.env" \
  "$HOST:$REMOTE_DIR/"

rsync -avz -e "ssh -p $PORT -i $KEY" \
  "$LOCAL_DIR/data/" \
  "$HOST:$REMOTE_DIR/data/"

echo "=== 3. Instalando dependências Node.js ==="
ssh -p $PORT -i $KEY $HOST "cd $REMOTE_DIR && npm install --omit=dev"

echo "=== 4. Configurando cron ==="
# Adiciona linha ao crontab (se não existir)
CRON_LINE="0 11 * * 1-6 cd $REMOTE_DIR && /usr/local/bin/node tools/stories/cloud-scheduler.js >> $REMOTE_DIR/logs/stories-\$(date +\%Y-\%m-\%d).log 2>&1"

ssh -p $PORT -i $KEY $HOST "
  mkdir -p $REMOTE_DIR/logs
  (crontab -l 2>/dev/null | grep -v 'cloud-scheduler'; echo '$CRON_LINE') | crontab -
  echo 'Cron atual:'
  crontab -l
"

echo ""
echo "=== ✅ Configuração concluída ==="
echo "O scheduler rodará todo dia às 8h BRT (Seg a Sáb)."
echo "Logs em: $REMOTE_DIR/logs/"
echo ""
echo "Para testar manualmente:"
echo "  ssh -p $PORT -i $KEY $HOST 'cd $REMOTE_DIR && node tools/stories/cloud-scheduler.js'"
