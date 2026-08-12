<?php
/**
 * OI Gestão Periódica Proxy
 * Hospedado no Hostgator (IP brasileiro) — acessado pelo GitHub Actions.
 * Faz login no OI, busca o relatório Gestão Periódica e retorna o HTML.
 *
 * POST body (JSON):
 *   token      — segredo de autenticação (OI_PROXY_SECRET)
 *   email      — OI_EMAIL
 *   senha      — OI_SENHA
 *   de         — data inicial "dd/mm/yyyy"
 *   ate        — data final "dd/mm/yyyy"
 *   loja       — valor do ddl (469, 2202, 1524, 3098)
 */

header('Content-Type: application/json; charset=utf-8');
set_time_limit(120);

$raw  = file_get_contents('php://input');
$body = json_decode($raw, true);

// Autenticação
$secret = getenv('OI_PROXY_SECRET') ?: '';
if (!$secret || ($body['token'] ?? '') !== $secret) {
    http_response_code(403);
    echo json_encode(['error' => 'Forbidden']);
    exit;
}

$email = $body['email'] ?? '';
$senha = $body['senha'] ?? '';
$de    = $body['de']    ?? date('d/m/Y', strtotime('-1 day'));
$ate   = $body['ate']   ?? $de;
$loja  = $body['loja']  ?? '';

if (!$email || !$senha || !$loja) {
    http_response_code(400);
    echo json_encode(['error' => 'Parametros obrigatorios: email, senha, loja']);
    exit;
}

$cookieFile = tempnam(sys_get_temp_dir(), 'oi_');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function curlGet($url, $cookieFile) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_COOKIEJAR      => $cookieFile,
        CURLOPT_COOKIEFILE     => $cookieFile,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_TIMEOUT        => 30,
        CURLOPT_USERAGENT      => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        CURLOPT_HTTPHEADER     => [
            'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language: pt-BR,pt;q=0.9',
        ],
    ]);
    $html = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return ['html' => $html, 'code' => $code];
}

function curlPost($url, $fields, $cookieFile, $referer = '') {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => http_build_query($fields),
        CURLOPT_COOKIEJAR      => $cookieFile,
        CURLOPT_COOKIEFILE     => $cookieFile,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_TIMEOUT        => 30,
        CURLOPT_USERAGENT      => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        CURLOPT_HTTPHEADER     => [
            'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language: pt-BR,pt;q=0.9',
            'Content-Type: application/x-www-form-urlencoded',
            $referer ? "Referer: $referer" : '',
        ],
    ]);
    $html = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return ['html' => $html, 'code' => $code];
}

function extractHidden($html) {
    $fields = [];
    preg_match_all('/<input[^>]+type=["\']?hidden["\']?[^>]*>/i', $html, $inputs);
    foreach ($inputs[0] as $input) {
        preg_match('/name=["\']([^"\']+)["\']/', $input, $nm);
        preg_match('/value=["\']([^"\']*)["\']/', $input, $vl);
        if (!empty($nm[1])) {
            $fields[$nm[1]] = $vl[1] ?? '';
        }
    }
    return $fields;
}

// ─── 1. Login ────────────────────────────────────────────────────────────────

$loginUrl = 'https://sistemaoficinainteligente.com.br/Entrar.aspx?sair=1';
$r = curlGet($loginUrl, $cookieFile);

if ($r['code'] !== 200 || empty($r['html'])) {
    @unlink($cookieFile);
    echo json_encode(['error' => "Login page returned HTTP {$r['code']}"]);
    exit;
}

$hidden = extractHidden($r['html']);
if (empty($hidden['__VIEWSTATE'])) {
    @unlink($cookieFile);
    echo json_encode(['error' => 'Login page: __VIEWSTATE not found', 'code' => $r['code'], 'html_preview' => substr($r['html'], 0, 300)]);
    exit;
}

$loginFields = array_merge($hidden, [
    'Login1$UserName'   => $email,
    'Login1$Password'   => $senha,
    'Login1$btnEntrar'  => 'Entrar',
]);

$r2 = curlPost($loginUrl, $loginFields, $cookieFile, $loginUrl);

// Verifica se logou (página após login não tem mais o form de login)
if (strpos($r2['html'], 'Login1$UserName') !== false) {
    @unlink($cookieFile);
    echo json_encode(['error' => 'Login falhou — credenciais incorretas ou captcha']);
    exit;
}

// ─── 2. Navegar ao relatório ──────────────────────────────────────────────────

$relUrl = 'https://sistemaoficinainteligente.com.br/wfRelatorioOperacao.aspx';
$r3 = curlGet($relUrl, $cookieFile);

if ($r3['code'] !== 200) {
    @unlink($cookieFile);
    echo json_encode(['error' => "Relatório page HTTP {$r3['code']}"]);
    exit;
}

// ─── 3. Trocar de loja (se necessário) ───────────────────────────────────────

$hidden3 = extractHidden($r3['html']);

// Verifica loja atual
preg_match('/option[^>]+selected[^>]*value=["\'](\d+)["\']/', $r3['html'], $selectedLoja);
$lojaAtual = $selectedLoja[1] ?? '';

if ($lojaAtual !== $loja) {
    $switchFields = array_merge($hidden3, [
        'ddlTrocarEmpresa'         => $loja,
        'ctl00$btnTrocarEmpresa'   => '',
        '__EVENTTARGET'            => '',
        '__EVENTARGUMENT'          => '',
    ]);
    $r4 = curlPost($relUrl, $switchFields, $cookieFile, $relUrl);
    // Re-busca a página depois de trocar de loja
    $r3 = curlGet($relUrl, $cookieFile);
    $hidden3 = extractHidden($r3['html']);
}

// ─── 4. Gerar relatório Gestão Periódica ────────────────────────────────────

$reportFields = array_merge($hidden3, [
    '__EVENTTARGET'                    => '',
    '__EVENTARGUMENT'                  => '',
    'ctl00$cph$txtDataInicial'         => $de,
    'ctl00$cph$txtDataFinal'           => $ate,
    'ctl00$cph$ddlMostrarOS'           => 'True',
    'ctl00$cph$btnGestaoPeriodica'     => 'Gestão Periódica',
]);

$r5 = curlPost($relUrl, $reportFields, $cookieFile, $relUrl);

@unlink($cookieFile);

if ($r5['code'] !== 200 || empty($r5['html'])) {
    echo json_encode(['error' => "Relatório HTTP {$r5['code']}"]);
    exit;
}

// Verifica se tem dados (presença de "Ordem de Serviço" no texto)
$hasData = strpos($r5['html'], 'Ordem de Servi') !== false
        || strpos($r5['html'], 'OS N') !== false;

echo json_encode([
    'ok'       => true,
    'html'     => $r5['html'],
    'has_data' => $hasData,
    'size'     => strlen($r5['html']),
]);
