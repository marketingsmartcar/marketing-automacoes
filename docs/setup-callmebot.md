# Como Ativar o CallMeBot (5 minutos)

O CallMeBot é um serviço gratuito que permite enviar mensagens de WhatsApp via API.
O sistema de monitoramento de Ads vai usar ele para te avisar quando o saldo estiver baixo.

## Passo a passo:

### 1. Salve o contato
Abra os contatos do seu celular e adicione:
- Nome: CallMeBot
- Número: +34 644 52 74 88

### 2. Envie a mensagem de ativação
Abra o WhatsApp e envie esta mensagem EXATAMENTE como está para o número salvo:

```
I allow callmebot to send me messages
```

### 3. Aguarde a resposta
O CallMeBot vai responder com sua API Key. Exemplo:
"Your API key is: 1234567"

### 4. Copie a API Key e seu número de telefone

### 5. Diga ao Claude Code:
"Minha API Key do CallMeBot é XXXXXXX e meu número é 55XXXXXXXXXXX"

Ou cole diretamente no `.env`:
```
CALLMEBOT_API_KEY=sua_api_key
CALLMEBOT_PHONE=55XX9XXXXXXXX
```
(com 55 na frente, sem +, sem espaços, sem traços)

### 6. Testar
No Claude Code, rode:
```bash
npm run whatsapp:test
```
Você deve receber uma mensagem de teste no WhatsApp.

---

## Observações

- É 100% gratuito
- Sem limite de mensagens por dia
- A mensagem chega no seu WhatsApp pessoal
- O número é da Espanha (+34) mas funciona globalmente
- Se quiser que outra pessoa também receba, ela precisa fazer o mesmo processo com o número dela

---

## Solução de Problemas

**Não recebi a API Key:**
- Certifique-se de ter salvado o contato antes de enviar
- Reenvie a mensagem "I allow callmebot to send me messages"
- Aguarde até 1 minuto

**Erro "API Key not found":**
- Verifique se a CALLMEBOT_API_KEY no .env está correta (apenas os números)
- Tente reativar reenviando a mensagem de ativação

**Erro no número de telefone:**
- Formato correto: `55119XXXXXXXX` (55 + DDD + número)
- Exemplo SP: `5511987654321`
- Exemplo interior SP: `5516987654321`
- Sem +, espaços ou traços
