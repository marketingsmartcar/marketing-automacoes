<?php
/**
 * hostgator-trigger.php
 *
 * Dispara o workflow de stories no GitHub Actions exatamente às 8h BRT.
 * Hospedar no Hostgator e configurar cron para rodar às 11:00 UTC (8h BRT):
 *   0 11 * * 1-6   /usr/bin/php /home/brpneu76/public_html/cron/stories-trigger.php
 *
 * OU via curl no cPanel Cron Jobs:
 *   curl -s https://seudominio.com.br/cron/stories-trigger.php > /dev/null 2>&1
 */

// Substitua pelo seu Personal Access Token do GitHub (scope: workflow)
define('GITHUB_TOKEN', 'SEU_GITHUB_TOKEN_AQUI');
define('GH_REPO',      'marketingsmartcar/marketing-automacoes');
define('GH_WORKFLOW',  'stories-diarios.yml');

$url     = "https://api.github.com/repos/" . GH_REPO . "/actions/workflows/" . GH_WORKFLOW . "/dispatches";
$payload = json_encode(['ref' => 'main']);

$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => $payload,
    CURLOPT_HTTPHEADER     => [
        'Authorization: Bearer ' . GITHUB_TOKEN,
        'Accept: application/vnd.github+json',
        'X-GitHub-Api-Version: 2022-11-28',
        'Content-Type: application/json',
        'User-Agent: Hostgator-Stories-Trigger',
    ],
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

$status  = ($httpCode === 204) ? 'OK' : 'ERRO';
$logLine = date('Y-m-d H:i:s') . " [{$status}] HTTP {$httpCode} | " . substr($response ?: 'sem resposta', 0, 100);

// Salva log no servidor
$logFile = __DIR__ . '/stories-trigger.log';
file_put_contents($logFile, $logLine . PHP_EOL, FILE_APPEND);

echo $logLine;
