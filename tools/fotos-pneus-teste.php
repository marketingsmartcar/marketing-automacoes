<?php
/**
 * fotos-pneus-teste.php — teste diagnóstico no HostGator
 * Roda: php fotos-pneus-teste.php
 * Testa APENAS o primeiro grupo da BR01 para ver se AJAX funciona
 */
set_time_limit(120);
ini_set('memory_limit', '128M');

function loadEnv($path) {
    if (!file_exists($path)) return;
    foreach (file($path) as $line) {
        $line = trim($line);
        if (!$line || $line[0] === '#' || strpos($line, '=') === false) continue;
        list($k, $v) = explode('=', $line, 2);
        putenv(trim($k) . '=' . trim($v, "\"' \t"));
    }
}
$envPath = __DIR__ . '/../../.env';
if (!file_exists($envPath)) $envPath = '/home3/brpneu76/marketing-automation/.env';
loadEnv($envPath);

$OI_EMAIL = getenv('OI_EMAIL');
$OI_SENHA = getenv('OI_SENHA');
$OI_BASE  = 'https://sistemaoficinainteligente.com.br';

echo "OI_EMAIL: $OI_EMAIL\n";
if (!$OI_EMAIL || !$OI_SENHA) { echo "ERRO: credenciais ausentes\n"; exit(1); }

$cookieFile = tempnam(sys_get_temp_dir(), 'oi_test_');
echo "Cookie file: $cookieFile\n";

function c($url, $ck, $fields=null, $hdrs=[]) {
    $h = [
        'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept: text/html,application/xhtml+xml,*/*;q=0.9',
        'Accept-Language: pt-BR,pt;q=0.9',
        'Accept-Encoding: identity',
        'Connection: keep-alive',
    ];
    foreach ($hdrs as $hh) $h[] = $hh;
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_COOKIEJAR      => $ck,
        CURLOPT_COOKIEFILE     => $ck,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_TIMEOUT        => 60,
        CURLOPT_HTTPHEADER     => $h,
        CURLOPT_ENCODING       => '',
    ]);
    if ($fields) {
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($fields));
        if (!in_array('Content-Type: application/x-www-form-urlencoded', $h))
            curl_setopt($ch, CURLOPT_HTTPHEADER, array_merge($h, ['Content-Type: application/x-www-form-urlencoded']));
    }
    $body = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err  = curl_error($ch);
    curl_close($ch);
    return ['body' => $body ?: '', 'code' => $code, 'err' => $err];
}

function hidden($html) {
    $f = [];
    preg_match_all('/<input[^>]+type=["\']?hidden["\']?[^>]*>/i', $html, $ins);
    foreach ($ins[0] as $in) {
        if (preg_match('/name=["\']([^"\']+)["\']/', $in, $n) &&
            preg_match('/value=["\']([^"\']*)["\']/', $in, $v))
            $f[$n[1]] = $v[1];
    }
    return $f;
}

function parseHidden($delta) {
    $f = [];
    $pos = 0;
    while (($p = strpos($delta, '|hiddenField|', $pos)) !== false) {
        $sz  = (int)trim(substr($delta, strrpos(substr($delta,0,$p),'|')+1, $p - strrpos(substr($delta,0,$p),'|')-1));
        $ns  = $p + 13;
        $ne  = strpos($delta, '|', $ns);
        if ($ne === false) break;
        $nm  = substr($delta, $ns, $ne - $ns);
        $val = substr($delta, $ne + 1, $sz);
        $f[$nm] = $val;
        $pos = $ne + 1 + $sz;
    }
    return $f;
}

function parsePanel($body) {
    preg_match_all('/(\d+)\|updatePanel\|([^|]+)\|/', $body, $ms, PREG_OFFSET_CAPTURE);
    $best = null;
    for ($i = 0; $i < count($ms[0]); $i++) {
        $sz = (int)$ms[1][$i][0];
        $st = $ms[0][$i][1] + strlen($ms[0][$i][0]);
        if (!$best || $sz > $best['sz']) $best = ['sz'=>$sz,'st'=>$st];
    }
    return $best ? substr($body, $best['st'], $best['sz']) : '';
}

// 1. Login
echo "\n1. Login...\n";
$r1 = c("$OI_BASE/Entrar.aspx?sair=1", $cookieFile);
echo "  GET: {$r1['code']} len:" . strlen($r1['body']) . "\n";

$h1 = hidden($r1['body']);
$r2 = c("$OI_BASE/Entrar.aspx", $cookieFile, array_merge($h1, [
    'Login1$UserName'  => $OI_EMAIL,
    'Login1$Password'  => $OI_SENHA,
    'Login1$btnEntrar' => 'Entrar',
]));
echo "  POST: {$r2['code']}, logado:" . (strpos($r2['body'], 'Login1$UserName') === false ? 'SIM' : 'NAO') . "\n";

// 2. Troca empresa BR01
echo "\n2. Troca empresa BR01 (469)...\n";
$rp = c("$OI_BASE/wfPrincipal.aspx", $cookieFile);
$hp = hidden($rp['body']);
$rp2 = c("$OI_BASE/wfPrincipal.aspx", $cookieFile, array_merge($hp, [
    'ctl00$ddlTrocarEmpresa' => '469',
    'ctl00$btnTrocarEmpresa' => 'Trocar Empresa',
    '__EVENTTARGET'          => '',
    '__EVENTARGUMENT'        => '',
]));
echo "  POST: {$rp2['code']}\n";

// 3. GET busca
echo "\n3. GET wfProdutoBusca...\n";
$rb = c("$OI_BASE/wfProdutoBusca.aspx", $cookieFile, null, ["Referer: $OI_BASE/wfPrincipal.aspx"]);
echo "  GET: {$rb['code']} len:" . strlen($rb['body']) . "\n";

$hb = hidden($rb['body']);
echo "  VIEWSTATE len:" . strlen($hb['__VIEWSTATE'] ?? '') . "\n";
echo "  EVENTVALIDATION len:" . strlen($hb['__EVENTVALIDATION'] ?? '') . "\n";

// SM e UP
$smId = 'ctl00$cph$tksm';
if (preg_match("/Sys\\.WebForms\\.PageRequestManager\\._initialize\\('([^']+)'/", $rb['body'], $m))
    $smId = $m[1];
$upId = 'ctl00$cph$upPanel';
if (preg_match('/<div[^>]+id="(ctl00_cph_(?:up|Update)[^"]+)"[^>]*>/', $rb['body'], $m))
    $upId = str_replace('_', '$', $m[1]);
echo "  SM: $smId\n  UP: $upId\n";

// Pega primeiro grupo PNEU*
$grupos = [];
preg_match_all('/<option[^>]*value="([^"]+)"[^>]*>([^<]+)<\/option>/i', $rb['body'], $ms);
for ($i = 0; $i < count($ms[0]); $i++) {
    $text = trim($ms[2][$i]);
    if (stripos($text, 'PNEU IMPORTADO') === 0 || stripos($text, 'PNEU NACIONAL') === 0)
        $grupos[] = ['value' => $ms[1][$i], 'text' => $text];
}
echo "  Grupos encontrados: " . count($grupos) . "\n";
if (!$grupos) { echo "NENHUM GRUPO!\n"; exit(1); }

// 4. AJAX para 2 grupos seguidos (para testar se o segundo também funciona)
for ($gi = 0; $gi < min(2, count($grupos)); $gi++) {
    $g = $grupos[$gi];
    echo "\n4.$gi AJAX grupo '{$g['text']}' (val={$g['value']})...\n";

    $aj = array_merge($hb, [
        $smId                           => "$upId|ctl00\$cph\$btnBuscar",
        '__ASYNCPOST'                   => 'true',
        '__EVENTTARGET'                 => '',
        '__EVENTARGUMENT'               => '',
        '__LASTFOCUS'                   => '',
        'ctl00$cph$ddlGrupoDeProduto'   => $g['value'],
        'ctl00$cph$ddlAtivo'            => '1',
        'ctl00$cph$rblEstoque'          => '1',
        'ctl00$cph$rblProdutoOuServico' => 'P',
        'ctl00$cph$btnBuscar'           => 'Buscar',
    ]);

    $r5 = c("$OI_BASE/wfProdutoBusca.aspx", $cookieFile, $aj, [
        "Referer: $OI_BASE/wfProdutoBusca.aspx",
        "Origin: $OI_BASE",
        'X-Requested-With: XMLHttpRequest',
        'X-MicrosoftAjax: Delta=true',
        'Content-Type: application/x-www-form-urlencoded',
    ]);

    echo "  POST: {$r5['code']} len:" . strlen($r5['body']) . "\n";
    echo "  Inicio: " . substr($r5['body'], 0, 150) . "\n";
    $pids = substr_count($r5['body'], 'ProdutoID=');
    echo "  PIDs: $pids\n";

    if (strpos($r5['body'], 'pageRedirect') !== false) {
        echo "  ERRO: pageRedirect!\n";
    }

    // Atualiza hidden fields do delta
    $upd = parseHidden($r5['body']);
    if ($upd) {
        echo "  Hidden atualizados: " . implode(', ', array_keys($upd)) . "\n";
        $hb = array_merge($hb, $upd);
    }

    // Mostra primeira linha de produto
    $panel = parsePanel($r5['body']);
    if ($panel) {
        preg_match('/ProdutoID=([^&\'"]+)/i', $panel, $pid);
        echo "  1º ProdutoID: " . ($pid[1] ?? 'N/A') . "\n";
    }

    usleep(500000);
}

@unlink($cookieFile);
echo "\nTeste concluído.\n";
