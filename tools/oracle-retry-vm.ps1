$OCI        = "C:\Users\Nick\bin\oci.exe"
$TENANCY    = "ocid1.tenancy.oc1..aaaaaaaaldjmmguqjgwlzzbb63wfvzvbwvvihkb24xi5ql6qegjtub6k52pq"
$SUBNET     = "ocid1.subnet.oc1.sa-saopaulo-1.aaaaaaaauvhgv6diil5hc3z5u6ybigcc5z6zr5t66uv3yw7n3qhkrftm5hgq"
$IMAGE      = "ocid1.image.oc1.sa-saopaulo-1.aaaaaaaaemf52b7af7ncncxz6pdc6hrlkdmylvwejfzpwnpbuhlfxwhrno6a"
$SSH_KEY    = "C:\Users\Nick\.oci\oracle-bot_public.pem"
$WA_BOT     = "http://127.0.0.1:3099"
$WA_GRUPO   = "5516997593460-1554117583@g.us"
$LOG        = "C:\Users\Nick\Downloads\Marketing\output\debug-bi\oracle-retry.log"

New-Item -ItemType Directory -Force -Path (Split-Path $LOG) | Out-Null

function Log($msg) {
    $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $line = "[$ts] $msg"
    Write-Host $line
    Add-Content -Path $LOG -Value $line
}

function NotificarWA($texto) {
    try {
        $body = @{ to = $WA_GRUPO; message = $texto } | ConvertTo-Json
        Invoke-RestMethod -Uri "$WA_BOT/send" -Method POST -Body $body -ContentType "application/json" -TimeoutSec 10 | Out-Null
    } catch {
        Log "Falha WA: $_"
    }
}

Log "=== Iniciando retry VM Oracle Cloud ==="
NotificarWA "Iniciando tentativas de criar VM Oracle Cloud (retry a cada 5 min)..."

$tentativa = 0
while ($true) {
    $tentativa++
    Log "Tentativa #$tentativa..."

    $result = & $OCI compute instance launch `
        --availability-domain "kWGI:SA-SAOPAULO-1-AD-1" `
        --compartment-id $TENANCY `
        --shape "VM.Standard.A1.Flex" `
        --shape-config '{"ocpus":4,"memoryInGBs":24}' `
        --subnet-id $SUBNET `
        --image-id $IMAGE `
        --display-name "whatsapp-bot" `
        --ssh-authorized-keys-file $SSH_KEY `
        --assign-public-ip true `
        2>&1

    $resultStr = ($result | Out-String)

    if ($resultStr -match '"lifecycle-state"\s*:\s*"PROVISIONING"') {
        Log "VM CRIADA! Aguardando IP..."
        $instanceId = [regex]::Match($resultStr, '"id"\s*:\s*"(ocid1\.instance[^"]+)"').Groups[1].Value
        Log "Instance ID: $instanceId"
        Start-Sleep -Seconds 90
        $vnics = & $OCI compute instance list-vnics --instance-id $instanceId 2>&1 | Out-String
        $ip = [regex]::Match($vnics, '"public-ip"\s*:\s*"([^"]+)"').Groups[1].Value
        Log "IP Publico: $ip"
        NotificarWA "VM Oracle criada! IP: $ip | SSH: ubuntu@$ip | Chave: C:\Users\Nick\.oci\oracle-bot.pem"
        break
    } elseif ($resultStr -match "Out of capacity|InternalError") {
        Log "Sem capacidade. Aguardando 5 min..."
    } elseif ($resultStr -match "NotAuthenticated|AuthorizationFailed") {
        Log "ERRO AUTH"
        NotificarWA "Erro autenticacao Oracle - verifique o script"
        break
    } elseif ($resultStr -match "LimitExceeded") {
        Log "LimitExceeded - VM pode ja existir!"
        NotificarWA "LimitExceeded Oracle - verifique se VM ja foi criada no console"
        break
    } else {
        Log "Sem capacidade ou erro desconhecido. Aguardando 5 min..."
    }

    Start-Sleep -Seconds 300
}