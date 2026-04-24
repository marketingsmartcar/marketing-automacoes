# Setup — APIs de Ads (Meta + Google)

> Este guia explica como obter as credenciais para o sistema de monitoramento de anúncios.

---

## 1. Meta Ads API

### Passo 1 — Criar o App no Meta for Developers

1. Acesse https://developers.facebook.com/apps/
2. Clique em **"Criar App"**
3. Tipo: **"Negócios"**
4. Dê um nome (ex: "BR Pneus Monitor")
5. Vincule à sua **Conta Comercial** no Business Manager

### Passo 2 — Ativar o produto "Marketing API"

1. No painel do App, clique em **"Adicionar Produto"**
2. Encontre **"Marketing API"** e clique em **"Configurar"**

### Passo 3 — Gerar o System User Token (recomendado para automação)

1. Acesse: https://business.facebook.com/settings/
2. Usuários → **Usuários do Sistema**
3. Crie um System User com permissão de **Admin**
4. Clique em **"Gerar Token"**
5. Selecione o App criado + permissões:
   - `ads_read`
   - `ads_management`
   - `business_management`
6. Copie o token gerado

### Passo 4 — Adicionar ao .env

```
META_APP_ID=seu_app_id_aqui
META_APP_SECRET=seu_app_secret_aqui
META_ACCESS_TOKEN=seu_system_user_token_aqui
```

> **Nota:** System User tokens não expiram (ao contrário de tokens de usuário).
> Para tokens de usuário, use a [ferramenta de acesso](https://developers.facebook.com/tools/accesstoken/)
> e renove a cada 60 dias com `/oauth/access_token`.

---

## 2. Google Ads API

### Passo 1 — Solicitar Developer Token

1. Acesse: https://ads.google.com/
2. Ferramentas (🔧) → Configurações → **Acesso à API**
3. Se ainda não tiver, clique em **"Solicitar acesso à API"**
4. Preencha o formulário (uso: automação de relatórios)
5. Aguarde aprovação (pode levar alguns dias)
6. O **Developer Token** aparecerá na mesma página após aprovação

> Em ambiente de teste (antes da aprovação), use o token de nível de teste —
> só funciona com contas de teste, não com contas reais.

### Passo 2 — Criar credenciais OAuth 2.0

1. Acesse: https://console.cloud.google.com/
2. Crie um projeto (ex: "BR Pneus Ads Monitor")
3. APIs e Serviços → **Biblioteca** → ative a **Google Ads API**
4. APIs e Serviços → **Credenciais** → **Criar Credenciais** → **ID do cliente OAuth**
5. Tipo: **Aplicativo de Desktop**
6. Copie o **Client ID** e o **Client Secret**

### Passo 3 — Gerar o Refresh Token

Execute no terminal:

```bash
# Instalar o cliente OAuth do Google (apenas para gerar o token)
npm install -g google-auth-library

# Ou use este script simples:
node -e "
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(
  'SEU_CLIENT_ID',
  'SEU_CLIENT_SECRET',
  'urn:ietf:wg:oauth:2.0:oob'
);
const url = client.generateAuthUrl({
  access_type: 'offline',
  scope: ['https://www.googleapis.com/auth/adwords'],
  prompt: 'consent'
});
console.log('Abra este URL:', url);
"
```

Abra o URL no navegador → autorize a conta → copie o código exibido.

```bash
node -e "
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client('SEU_CLIENT_ID', 'SEU_CLIENT_SECRET', 'urn:ietf:wg:oauth:2.0:oob');
client.getToken('CODIGO_AQUI').then(r => console.log('Refresh Token:', r.tokens.refresh_token));
"
```

### Passo 4 — Login Customer ID (MCC)

Se suas contas estão sob uma conta gerenciadora (MCC):
1. Acesse o MCC em https://ads.google.com/
2. O ID aparece no canto superior direito (formato: `XXX-XXX-XXXX`)
3. Remova os traços: `XXXXXXXXXX`

### Passo 5 — Adicionar ao .env

```
GOOGLE_ADS_DEVELOPER_TOKEN=seu_developer_token
GOOGLE_ADS_CLIENT_ID=seu_client_id.apps.googleusercontent.com
GOOGLE_ADS_CLIENT_SECRET=seu_client_secret
GOOGLE_ADS_REFRESH_TOKEN=seu_refresh_token
GOOGLE_ADS_LOGIN_CUSTOMER_ID=seu_mcc_id_sem_tracoes
```

---

## 3. Testar a configuração

```bash
# Testar Meta Ads (todas as contas)
npm run ads:meta

# Testar Google Ads (todas as contas)
npm run ads:google

# Relatório completo
npm run ads
```

---

## 4. Problemas Comuns

| Erro | Causa | Solução |
|------|-------|---------|
| `META_ACCESS_TOKEN não configurado` | Token ausente no .env | Siga Passo 3 do Meta acima |
| `Meta API Error [190]` | Token expirado | Gere um novo System User Token |
| `Meta API Error [200]` | Sem permissão na conta | Adicione o System User à conta de anúncios |
| `Falha ao obter access_token Google` | Refresh token inválido | Regere o refresh token (Passo 3 do Google) |
| `Google Ads API Error: DEVELOPER_TOKEN_NOT_APPROVED` | Token em modo teste | Solicite aprovação no painel Google Ads |
| `Google Ads API Error: CUSTOMER_NOT_FOUND` | ID de conta errado | Verifique o Customer ID sem traços no .env |

---

## 5. Referências

- Meta Marketing API: https://developers.facebook.com/docs/marketing-apis/
- Google Ads API: https://developers.google.com/google-ads/api/docs/start
- Google Ads GAQL: https://developers.google.com/google-ads/api/docs/query/overview
- Contas monitoradas: [`knowledge/contas-ads.md`](../knowledge/contas-ads.md)
