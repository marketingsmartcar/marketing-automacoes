<?php
/**
 * fotos-pneus-cron.php — cron HostGator
 * Busca fotos de pneus no OI e salva no Drive + atualiza Supabase.
 * Roda: php /home3/brpneu76/marketing-automation/tools/fotos-pneus-cron.php
 */
set_time_limit(300);
ini_set('memory_limit', '256M');
error_reporting(E_ALL);

// ─── Lê .env ──────────────────────────────────────────────────────────────────
function loadEnv($path) {
    if (!file_exists($path)) return;
    foreach (file($path) as $line) {
        $line = trim($line);
        if (!$line || $line[0] === '#' || strpos($line, '=') === false) continue;
        list($k, $v) = explode('=', $line, 2);
        $v = trim($v, "\"' \t");
        putenv("$k=$v");
    }
}
$envPath = __DIR__ . '/../../.env';
if (!file_exists($envPath)) $envPath = __DIR__ . '/../.env';
loadEnv($envPath);

$OI_EMAIL  = getenv('OI_EMAIL');
$OI_SENHA  = getenv('OI_SENHA');
$SUPA_URL  = getenv('NEXUSZ_SUPABASE_URL') ?: getenv('SUPABASE_URL');
$SUPA_KEY  = getenv('NEXUSZ_SUPABASE_SERVICE_ROLE_KEY') ?: getenv('SUPABASE_SERVICE_ROLE_KEY');
$OI_BASE   = 'https://sistemaoficinainteligente.com.br';

if (!$OI_EMAIL || !$OI_SENHA || !$SUPA_URL || !$SUPA_KEY) {
    fwrite(STDERR, "ERRO: Variáveis de ambiente ausentes\n");
    exit(1);
}

// Empresas ativas: BR01=469, BR03=2202, BR04=1524, PEG1=3098
$EMPRESAS = [
    ['id' => '469',  'nome' => 'BR01'],
    ['id' => '2202', 'nome' => 'BR03'],
    ['id' => '1524', 'nome' => 'BR04'],
    ['id' => '3098', 'nome' => 'PEG1'],
];

// ─── Curl helpers ─────────────────────────────────────────────────────────────
function curlGet($url, $cookieFile, $referer = '') {
    $h = [
        'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language: pt-BR,pt;q=0.9',
        'Accept-Encoding: identity',
        'Connection: keep-alive',
    ];
    if ($referer) $h[] = "Referer: $referer";
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_COOKIEJAR      => $cookieFile,
        CURLOPT_COOKIEFILE     => $cookieFile,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_TIMEOUT        => 60,
        CURLOPT_HTTPHEADER     => $h,
        CURLOPT_ENCODING       => '',
    ]);
    $html = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err  = curl_error($ch);
    curl_close($ch);
    return ['html' => $html ?: '', 'code' => $code, 'err' => $err];
}

function curlPost($url, $fields, $cookieFile, $referer = '', $extraHeaders = []) {
    $h = [
        'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language: pt-BR,pt;q=0.9',
        'Accept-Encoding: identity',
        'Content-Type: application/x-www-form-urlencoded',
        'Connection: keep-alive',
    ];
    if ($referer) {
        $h[] = "Referer: $referer";
        $parsed = parse_url($referer);
        $h[] = "Origin: {$parsed['scheme']}://{$parsed['host']}";
    }
    foreach ($extraHeaders as $eh) $h[] = $eh;
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => http_build_query($fields),
        CURLOPT_COOKIEJAR      => $cookieFile,
        CURLOPT_COOKIEFILE     => $cookieFile,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_TIMEOUT        => 60,
        CURLOPT_HTTPHEADER     => $h,
        CURLOPT_ENCODING       => '',
    ]);
    $html = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err  = curl_error($ch);
    curl_close($ch);
    return ['html' => $html ?: '', 'code' => $code, 'err' => $err];
}

function extractHidden($html) {
    $fields = [];
    preg_match_all('/<input[^>]+type=["\']?hidden["\']?[^>]*>/i', $html, $inputs);
    foreach ($inputs[0] as $input) {
        if (preg_match('/name=["\']([^"\']+)["\']/', $input, $nm) &&
            preg_match('/value=["\']([^"\']*)["\']/', $input, $vl)) {
            $fields[$nm[1]] = $vl[1];
        }
    }
    return $fields;
}

function parseUpdatePanel($body) {
    preg_match_all('/(\d+)\|updatePanel\|([^|]+)\|/', $body, $ms, PREG_OFFSET_CAPTURE);
    $best = null;
    for ($i = 0; $i < count($ms[0]); $i++) {
        $size  = (int)$ms[1][$i][0];
        $start = $ms[0][$i][1] + strlen($ms[0][$i][0]);
        if (!$best || $size > $best['size'])
            $best = ['size' => $size, 'start' => $start];
    }
    if (!$best) return '';
    return substr($body, $best['start'], $best['size']);
}

// Extrai campos hidden atualizados da resposta delta do UpdatePanel
// Formato: len|hiddenField|fieldName|value|
function parseUpdatedHiddenFields($deltaBody) {
    $updated = [];
    // Encontra todos os hiddenField no delta
    $pos = 0;
    while (($pipe1 = strpos($deltaBody, '|hiddenField|', $pos)) !== false) {
        // Volta para pegar o tamanho antes de |hiddenField|
        $sizeEnd = $pipe1;
        $sizeStart = strrpos(substr($deltaBody, 0, $sizeEnd), '|');
        $sizeStart = ($sizeStart === false) ? 0 : $sizeStart + 1;
        $size = (int)substr($deltaBody, $sizeStart, $sizeEnd - $sizeStart);

        $nameStart = $pipe1 + strlen('|hiddenField|');
        $nameEnd   = strpos($deltaBody, '|', $nameStart);
        if ($nameEnd === false) break;
        $name = substr($deltaBody, $nameStart, $nameEnd - $nameStart);

        $valueStart = $nameEnd + 1;
        $value = substr($deltaBody, $valueStart, $size);
        $updated[$name] = $value;

        $pos = $valueStart + $size;
    }
    return $updated;
}

function extrairUrlFoto($html, $oiBase) {
    preg_match_all('/<img[^>]+src=["\']([^"\']+)["\'][^>]*>/i', $html, $ms);
    foreach ($ms[1] as $src) {
        if (!$src || strlen($src) < 10) continue;
        if (preg_match('/spacer|logo|bg\.|btn|icon|\.gif$/i', $src)) continue;
        if (preg_match('/\.(jpg|jpeg|png|webp)/i', $src) ||
            stripos($src, '/Handler') !== false ||
            stripos($src, '/Foto') !== false) {
            if (!str_starts_with($src, 'http')) $src = $oiBase . '/' . ltrim($src, '/');
            return $src;
        }
    }
    return null;
}

// ─── Supabase helpers ─────────────────────────────────────────────────────────
function supabaseQuery($url, $key, $table, $query = '') {
    $ch = curl_init("$url/rest/v1/$table?$query");
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            "apikey: $key",
            "Authorization: Bearer $key",
            "Content-Type: application/json",
        ],
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_TIMEOUT => 30,
    ]);
    $body = curl_exec($ch);
    curl_close($ch);
    return json_decode($body, true) ?: [];
}

function supabaseUpdate($url, $key, $table, $filter, $data) {
    $ch = curl_init("$url/rest/v1/$table?$filter");
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST  => 'PATCH',
        CURLOPT_POSTFIELDS     => json_encode($data),
        CURLOPT_HTTPHEADER => [
            "apikey: $key",
            "Authorization: Bearer $key",
            "Content-Type: application/json",
            "Prefer: return=minimal",
        ],
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_TIMEOUT => 30,
    ]);
    $body = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return $code >= 200 && $code < 300;
}

function uploadToDrive($supaUrl, $supaKey, $imageUrl, $filename, $cookieFile) {
    // Baixa a imagem do OI usando os cookies de sessão
    $ch = curl_init($imageUrl);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_COOKIEFILE     => $cookieFile,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_TIMEOUT        => 30,
        CURLOPT_HTTPHEADER     => [
            'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        ],
    ]);
    $imgData = curl_exec($ch);
    $imgCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $imgType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
    curl_close($ch);

    if (!$imgData || $imgCode !== 200) return null;

    // Envia para a edge function upload-to-drive
    $tmpFile = tempnam(sys_get_temp_dir(), 'foto_') . '.jpg';
    file_put_contents($tmpFile, $imgData);

    $curlFile = new CURLFile($tmpFile, $imgType ?: 'image/jpeg', $filename);
    $postData = [
        'file'     => $curlFile,
        'folder'   => 'fotos-pneus',
        'filename' => $filename,
    ];

    $ch = curl_init("$supaUrl/functions/v1/upload-to-drive");
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $postData,
        CURLOPT_HTTPHEADER => [
            "Authorization: Bearer $supaKey",
        ],
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_TIMEOUT        => 60,
    ]);
    $resp = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    @unlink($tmpFile);

    if ($code !== 200) return null;
    $json = json_decode($resp, true);
    return $json['url'] ?? $json['webViewLink'] ?? $json['id'] ?? null;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
$logFile = __DIR__ . '/../../logs/fotos-pneus.log';
@mkdir(dirname($logFile), 0755, true);

function log_msg($msg) {
    global $logFile;
    $line = "[" . date('Y-m-d H:i:s') . "] $msg\n";
    echo $line;
    file_put_contents($logFile, $line, FILE_APPEND);
}

log_msg("=== Iniciando sync fotos pneus ===");

$totalProcessados = 0;
$totalAtualizados = 0;

foreach ($EMPRESAS as $empresa) {
    $cookieFile = tempnam(sys_get_temp_dir(), "oi_{$empresa['nome']}_");
    log_msg("--- {$empresa['nome']} (empresa {$empresa['id']}) ---");

    // 1. Login
    $loginUrl = "$OI_BASE/Entrar.aspx?sair=1";
    $r1 = curlGet($loginUrl, $cookieFile);
    if ($r1['code'] !== 200) { log_msg("ERRO login GET: {$r1['code']}"); @unlink($cookieFile); continue; }

    $hidden = extractHidden($r1['html']);
    $r2 = curlPost($loginUrl, array_merge($hidden, [
        'Login1$UserName'  => $OI_EMAIL,
        'Login1$Password'  => $OI_SENHA,
        'Login1$btnEntrar' => 'Entrar',
    ]), $cookieFile, $loginUrl);

    if (strpos($r2['html'], 'Login1$UserName') !== false) {
        log_msg("ERRO: login falhou"); @unlink($cookieFile); continue;
    }
    log_msg("Login OK");

    // 2. Troca empresa
    $principalUrl = "$OI_BASE/wfPrincipal.aspx";
    $r3 = curlGet($principalUrl, $cookieFile);
    $h3 = extractHidden($r3['html']);
    curlPost($principalUrl, array_merge($h3, [
        'ctl00$ddlTrocarEmpresa' => $empresa['id'],
        'ctl00$btnTrocarEmpresa' => 'Trocar Empresa',
        '__EVENTTARGET'          => '',
        '__EVENTARGUMENT'        => '',
    ]), $cookieFile, $principalUrl);
    log_msg("Empresa trocada");

    // 3. GET busca
    $buscaUrl = "$OI_BASE/wfProdutoBusca.aspx";
    $r4 = curlGet($buscaUrl, $cookieFile, $principalUrl);
    if ($r4['code'] !== 200) { log_msg("ERRO busca GET: {$r4['code']}"); @unlink($cookieFile); continue; }

    $hidden4 = extractHidden($r4['html']);

    // Detecta ScriptManager e UpdatePanel
    $smId = 'ctl00$cph$tksm';
    if (preg_match("/Sys\\.WebForms\\.PageRequestManager\\._initialize\\('([^']+)'/", $r4['html'], $m))
        $smId = $m[1];

    $upId = 'ctl00$cph$upPanel';
    if (preg_match('/<div[^>]+id="(ctl00_cph_(?:up|Update)[^"]+)"[^>]*>/', $r4['html'], $m))
        $upId = str_replace('_', '$', $m[1]);

    log_msg("SM: $smId / UP: $upId");

    // Extrai grupos PNEU*
    $grupos = [];
    preg_match_all('/<option[^>]*value="([^"]+)"[^>]*>([^<]+)<\/option>/i', $r4['html'], $ms);
    for ($i = 0; $i < count($ms[0]); $i++) {
        $text = trim($ms[2][$i]);
        if (stripos($text, 'PNEU IMPORTADO') === 0 || stripos($text, 'PNEU NACIONAL') === 0) {
            $grupos[] = ['value' => $ms[1][$i], 'text' => $text];
        }
    }
    log_msg("Grupos encontrados: " . count($grupos));
    if (!$grupos) { @unlink($cookieFile); continue; }

    // 4. Para cada grupo: AJAX search
    foreach ($grupos as $grupo) {
        $ajaxFields = array_merge($hidden4, [
            $smId                           => "$upId|ctl00\$cph\$btnBuscar",
            '__ASYNCPOST'                   => 'true',
            '__EVENTTARGET'                 => '',
            '__EVENTARGUMENT'               => '',
            '__LASTFOCUS'                   => '',
            'ctl00$cph$ddlGrupoDeProduto'   => $grupo['value'],
            'ctl00$cph$ddlAtivo'            => '1',
            'ctl00$cph$rblEstoque'          => '1',
            'ctl00$cph$rblProdutoOuServico' => 'P',
            'ctl00$cph$btnBuscar'           => 'Buscar',
        ]);

        $r5 = curlPost($buscaUrl, $ajaxFields, $cookieFile, $buscaUrl, [
            'X-Requested-With: XMLHttpRequest',
            'X-MicrosoftAjax: Delta=true',
        ]);

        if ($r5['code'] !== 200 || strpos($r5['html'], 'pageRedirect') !== false) {
            log_msg("  Grupo {$grupo['text']}: falhou ({$r5['code']})");
            // Tenta renovar VIEWSTATE após erro
            $r4x = curlGet($buscaUrl, $cookieFile, $buscaUrl);
            if ($r4x['code'] === 200) $hidden4 = extractHidden($r4x['html']);
            continue;
        }

        // Atualiza hidden fields com valores retornados pelo UpdatePanel
        $updatedHidden = parseUpdatedHiddenFields($r5['html']);
        if (!empty($updatedHidden)) {
            $hidden4 = array_merge($hidden4, $updatedHidden);
        }

        $panelHtml = parseUpdatePanel($r5['html']);
        $pids = substr_count($panelHtml, 'ProdutoID=');
        log_msg("  Grupo {$grupo['text']}: $pids produtos");

        if (!$pids) continue;

        // Extrai linhas com ProdutoID
        preg_match_all('/<tr[^>]*>(.*?)<\/tr>/is', $panelHtml, $rows);
        foreach ($rows[1] as $row) {
            if (!preg_match('/ProdutoID=([^&\'"]+)/i', $row, $pidM)) continue;
            if (!preg_match('/EmpresaID=([^&\'"]+)/i', $row, $eidM)) continue;

            $produtoId = urldecode($pidM[1]);
            $empresaId = urldecode($eidM[1]);

            preg_match_all('/<td[^>]*>(.*?)<\/td>/is', $row, $tds);
            $cells = array_map(fn($t) => trim(strip_tags($t)), $tds[1]);
            $desc = $cells[2] ?? $cells[1] ?? '';
            if (!$desc) continue;

            $totalProcessados++;

            // Acessa página do produto — aba fotos
            $prodUrl = "$OI_BASE/wfProduto.aspx?EmpresaID=" . urlencode($empresaId)
                     . "&ProdutoID=" . urlencode($produtoId);
            $rp = curlGet($prodUrl, $cookieFile, $buscaUrl);
            if ($rp['code'] !== 200) continue;

            // Tenta clicar na aba de documentos/foto via AJAX
            $hiddenProd = extractHidden($rp['html']);
            $smProd = $smId;
            if (preg_match("/Sys\\.WebForms\\.PageRequestManager\\._initialize\\('([^']+)'/", $rp['html'], $m2))
                $smProd = $m2[1];

            $upProd = $upId;
            if (preg_match('/<div[^>]+id="(ctl00_cph_(?:up|Update)[^"]+)"[^>]*>/', $rp['html'], $m2))
                $upProd = str_replace('_', '$', $m2[1]);

            // Procura tab de documentos
            $tabId = null;
            if (preg_match('/id="(__tab_tab_tab(?:Documento|Foto)[^"]*)"/', $rp['html'], $m2))
                $tabId = $m2[1];

            $fotoHtml = $rp['html'];
            if ($tabId) {
                $tabFields = array_merge($hiddenProd, [
                    $smProd           => "$upProd|$tabId",
                    '__ASYNCPOST'     => 'true',
                    '__EVENTTARGET'   => $tabId,
                    '__EVENTARGUMENT' => '',
                    '__LASTFOCUS'     => '',
                ]);
                $rt = curlPost($prodUrl, $tabFields, $cookieFile, $prodUrl, [
                    'X-Requested-With: XMLHttpRequest',
                    'X-MicrosoftAjax: Delta=true',
                ]);
                if ($rt['code'] === 200) $fotoHtml = parseUpdatePanel($rt['html']) ?: $fotoHtml;
            }

            $fotoUrl = extrairUrlFoto($fotoHtml, $OI_BASE);
            if (!$fotoUrl) continue;

            // Verifica se já tem foto no banco
            $rows2 = supabaseQuery($SUPA_URL, $SUPA_KEY, 'estoque_pneus',
                'select=id,foto_url&loja=eq.' . $empresa['nome'] . '&descricao=eq.' . urlencode($desc) . '&foto_url=is.null&limit=1');

            if (empty($rows2)) continue; // Já tem foto, pula

            // Upload para Drive
            $filename = "pneu_{$empresa['nome']}_{$produtoId}.jpg";
            $driveUrl = uploadToDrive($SUPA_URL, $SUPA_KEY, $fotoUrl, $filename, $cookieFile);

            if (!$driveUrl) {
                log_msg("    WARN: upload Drive falhou para $desc");
                continue;
            }

            // Atualiza Supabase
            $ok = supabaseUpdate($SUPA_URL, $SUPA_KEY, 'estoque_pneus',
                'loja=eq.' . $empresa['nome'] . '&descricao=eq.' . urlencode($desc),
                ['foto_url' => $driveUrl]);

            if ($ok) {
                $totalAtualizados++;
                log_msg("    OK: $desc → Drive");
            }

            usleep(300000); // 300ms entre produtos
        }

        usleep(500000); // 500ms entre grupos
    }

    @unlink($cookieFile);
    log_msg("Empresa {$empresa['nome']}: concluída");
}

log_msg("=== Concluído: $totalProcessados processados, $totalAtualizados atualizados ===");
