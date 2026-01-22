<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$configPath = __DIR__ . '/config.php';
if (!file_exists($configPath)) {
    http_response_code(500);
    echo json_encode(['error' => 'Falta api/config.php (cria a partir de config.sample.php)']);
    exit;
}
$config = require $configPath;

function db_connect(array $cfg): PDO {
    $dsn = sprintf(
        'mysql:host=%s;port=%d;dbname=%s;charset=%s',
        $cfg['host'],
        $cfg['port'],
        $cfg['name'],
        $cfg['charset']
    );
    return new PDO($dsn, $cfg['user'], $cfg['pass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
}

function json_body(): array {
    $raw = file_get_contents('php://input');
    if (!$raw) return [];
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function respond($data, int $code = 200): void {
    http_response_code($code);
    echo json_encode($data);
    exit;
}

function route(): string {
    $uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    $base = rtrim(dirname($_SERVER['SCRIPT_NAME']), '/');
    if ($base && strpos($uri, $base) === 0) {
        $uri = substr($uri, strlen($base));
    }
    return '/' . trim($uri, '/');
}

function route_parts(): array {
    $path = route();
    return $path === '/' ? [''] : explode('/', ltrim($path, '/'));
}

function require_fields(array $data, array $fields): array {
    $missing = [];
    foreach ($fields as $field) {
        if (!isset($data[$field]) || $data[$field] === '') {
            $missing[] = $field;
        }
    }
    return $missing;
}

function assert_enum(string $value, array $allowed, string $field): void {
    if (!in_array($value, $allowed, true)) {
        respond(['error' => "Campo invalido: {$field}"], 400);
    }
}

function to_number($value, bool $allowNull = true) {
    if ($value === null || $value === '') {
        return $allowNull ? null : 0;
    }
    $normalized = str_replace(',', '.', (string)$value);
    if (!is_numeric($normalized)) {
        respond(['error' => 'Valor numerico invalido'], 400);
    }
    return (float)$normalized;
}

try {
    $pdo = db_connect($config['db']);
} catch (Throwable $e) {
    respond(['error' => 'Falha de ligação à base de dados', 'details' => $e->getMessage()], 500);
}

$path = route();
$parts = route_parts();
$method = $_SERVER['REQUEST_METHOD'];

if ($path === '/' || $path === '/health') {
    respond(['status' => 'ok']);
}

if ($path === '/racoes' && $method === 'GET') {
    $stmt = $pdo->query('SELECT * FROM vw_racoes_metricas ORDER BY nome');
    respond($stmt->fetchAll());
}

if ($parts[0] === 'racoes' && isset($parts[1]) && $method === 'GET') {
    $id = (int)$parts[1];
    $stmt = $pdo->prepare('SELECT * FROM vw_racoes_metricas WHERE id = :id');
    $stmt->execute([':id' => $id]);
    $row = $stmt->fetch();
    if (!$row) respond(['error' => 'Ração não encontrada'], 404);
    respond($row);
}

if ($path === '/movimentos' && $method === 'GET') {
    $stmt = $pdo->query('SELECT m.id, m.data_movimento, m.tipo, m.motivo, r.sku, m.qtd_sacos, m.custo_unitario, m.preco_venda_unitario, m.observacoes
                         FROM movimentos m
                         JOIN racoes r ON r.id = m.racao_id
                         ORDER BY m.data_movimento DESC, m.id DESC
                         LIMIT 200');
    respond($stmt->fetchAll());
}

if ($parts[0] === 'movimentos' && isset($parts[1]) && $method === 'GET') {
    $id = (int)$parts[1];
    $stmt = $pdo->prepare('SELECT m.id, m.data_movimento, m.tipo, m.motivo, r.sku, m.qtd_sacos, m.custo_unitario, m.preco_venda_unitario, m.observacoes
                           FROM movimentos m
                           JOIN racoes r ON r.id = m.racao_id
                           WHERE m.id = :id');
    $stmt->execute([':id' => $id]);
    $row = $stmt->fetch();
    if (!$row) respond(['error' => 'Movimento nao encontrado'], 404);
    respond($row);
}

if ($path === '/dashboard' && $method === 'GET') {
    $stmt = $pdo->query('SELECT * FROM vw_dashboard');
    $row = $stmt->fetch();
    $row['last_updated'] = date('c');
    respond($row ?: ['valor_em_stock' => 0, 'total_compras' => 0, 'total_vendas' => 0, 'lucro_estimado' => 0, 'last_updated' => date('c')]);
}

if ($path === '/racoes' && $method === 'POST') {
    $data = json_body();
    $missing = require_fields($data, ['sku', 'nome', 'marca', 'pesoKg', 'precoVenda', 'stockMin', 'ativo']);
    if ($missing) respond(['error' => 'Campos obrigatorios em falta', 'fields' => $missing], 400);
    assert_enum($data['ativo'], ['SIM', 'NÃO'], 'ativo');
    try {
        $pesoKg = to_number($data['pesoKg'], false);
        $precoCompra = to_number($data['precoCompra'] ?? null, true);
        $precoVenda = to_number($data['precoVenda'], false);
        $stockMin = (int)to_number($data['stockMin'], false);
        $stmt = $pdo->prepare('INSERT INTO racoes (sku, nome, marca, variante, peso_kg, fornecedor, preco_compra, preco_venda, stock_minimo, ativo)
                               VALUES (:sku, :nome, :marca, :variante, :peso_kg, :fornecedor, :preco_compra, :preco_venda, :stock_minimo, :ativo)');
        $stmt->execute([
            ':sku' => $data['sku'] ?? '',
            ':nome' => $data['nome'] ?? '',
            ':marca' => $data['marca'] ?? '',
            ':variante' => $data['variante'] ?? null,
            ':peso_kg' => $pesoKg,
            ':fornecedor' => $data['fornecedor'] ?? null,
            ':preco_compra' => $precoCompra,
            ':preco_venda' => $precoVenda,
            ':stock_minimo' => $stockMin,
            ':ativo' => $data['ativo'] ?? 'SIM',
        ]);
        respond(['status' => 'ok', 'id' => $pdo->lastInsertId()], 201);
    } catch (Throwable $e) {
        respond(['error' => 'Nao foi possivel criar a racao', 'details' => $e->getMessage()], 400);
    }
}

if ($parts[0] === 'racoes' && isset($parts[1]) && $method === 'PUT') {
    $id = (int)$parts[1];
    $data = json_body();
    $missing = require_fields($data, ['sku', 'nome', 'marca', 'pesoKg', 'precoVenda', 'stockMin', 'ativo']);
    if ($missing) respond(['error' => 'Campos obrigatorios em falta', 'fields' => $missing], 400);
    assert_enum($data['ativo'], ['SIM', 'NÃO'], 'ativo');
    try {
        $pesoKg = to_number($data['pesoKg'], false);
        $precoCompra = to_number($data['precoCompra'] ?? null, true);
        $precoVenda = to_number($data['precoVenda'], false);
        $stockMin = (int)to_number($data['stockMin'], false);
        $stmt = $pdo->prepare('UPDATE racoes SET sku = :sku, nome = :nome, marca = :marca, variante = :variante, peso_kg = :peso_kg,
                               fornecedor = :fornecedor, preco_compra = :preco_compra, preco_venda = :preco_venda, stock_minimo = :stock_minimo, ativo = :ativo
                               WHERE id = :id');
        $stmt->execute([
            ':sku' => $data['sku'] ?? '',
            ':nome' => $data['nome'] ?? '',
            ':marca' => $data['marca'] ?? '',
            ':variante' => $data['variante'] ?? null,
            ':peso_kg' => $pesoKg,
            ':fornecedor' => $data['fornecedor'] ?? null,
            ':preco_compra' => $precoCompra,
            ':preco_venda' => $precoVenda,
            ':stock_minimo' => $stockMin,
            ':ativo' => $data['ativo'] ?? 'SIM',
            ':id' => $id,
        ]);
        respond(['status' => 'ok']);
    } catch (Throwable $e) {
        respond(['error' => 'Nao foi possivel atualizar a racao', 'details' => $e->getMessage()], 400);
    }
}

if ($parts[0] === 'racoes' && isset($parts[1]) && $method === 'DELETE') {
    $id = (int)$parts[1];
    try {
        $stmt = $pdo->prepare('DELETE FROM racoes WHERE id = :id');
        $stmt->execute([':id' => $id]);
        respond(['status' => 'ok']);
    } catch (Throwable $e) {
        respond(['error' => 'Nao foi possivel apagar a racao. Verifica se existem movimentos associados.', 'details' => $e->getMessage()], 400);
    }
}

if ($path === '/movimentos' && $method === 'POST') {
    $data = json_body();
    $missing = require_fields($data, ['data', 'tipo', 'motivo', 'sku', 'qtd']);
    if ($missing) respond(['error' => 'Campos obrigatorios em falta', 'fields' => $missing], 400);
    assert_enum($data['tipo'], ['ENTRADA', 'SAÍDA'], 'tipo');
    assert_enum($data['motivo'], ['COMPRA', 'VENDA', 'CONSUMO_CASA', 'AJUSTE'], 'motivo');
    $qtd = (int)to_number($data['qtd'], false);
    if ($qtd <= 0) respond(['error' => 'Quantidade invalida'], 400);
    $custo = to_number($data['custo'] ?? null, true);
    $precoVenda = to_number($data['precoVenda'] ?? null, true);
    if ($data['tipo'] === 'ENTRADA' && $data['motivo'] === 'COMPRA' && $custo === null) {
        respond(['error' => 'Custo unitario obrigatorio para compras'], 400);
    }
    if ($data['tipo'] === 'SAÍDA' && $data['motivo'] === 'VENDA' && $precoVenda === null) {
        respond(['error' => 'Preco de venda obrigatorio para vendas'], 400);
    }
    $stmt = $pdo->prepare('SELECT id FROM racoes WHERE sku = :sku');
    $stmt->execute([':sku' => $data['sku'] ?? '']);
    $racao = $stmt->fetch();
    if (!$racao) {
        respond(['error' => 'SKU inválido'], 400);
    }

    try {
        $stmt = $pdo->prepare('INSERT INTO movimentos (data_movimento, tipo, motivo, racao_id, qtd_sacos, custo_unitario, preco_venda_unitario, observacoes)
                               VALUES (:data_movimento, :tipo, :motivo, :racao_id, :qtd_sacos, :custo_unitario, :preco_venda_unitario, :observacoes)');
        $stmt->execute([
            ':data_movimento' => $data['data'] ?? date('Y-m-d'),
            ':tipo' => $data['tipo'] ?? 'ENTRADA',
            ':motivo' => $data['motivo'] ?? 'COMPRA',
            ':racao_id' => $racao['id'],
            ':qtd_sacos' => $qtd,
            ':custo_unitario' => $custo,
            ':preco_venda_unitario' => $precoVenda,
            ':observacoes' => $data['observacoes'] ?? null,
        ]);

        respond(['status' => 'ok', 'id' => $pdo->lastInsertId()], 201);
    } catch (Throwable $e) {
        respond(['error' => 'Nao foi possivel criar o movimento', 'details' => $e->getMessage()], 400);
    }
}

if ($parts[0] === 'movimentos' && isset($parts[1]) && $method === 'PUT') {
    $id = (int)$parts[1];
    $data = json_body();
    $missing = require_fields($data, ['data', 'tipo', 'motivo', 'sku', 'qtd']);
    if ($missing) respond(['error' => 'Campos obrigatorios em falta', 'fields' => $missing], 400);
    assert_enum($data['tipo'], ['ENTRADA', 'SAÍDA'], 'tipo');
    assert_enum($data['motivo'], ['COMPRA', 'VENDA', 'CONSUMO_CASA', 'AJUSTE'], 'motivo');
    $qtd = (int)to_number($data['qtd'], false);
    if ($qtd <= 0) respond(['error' => 'Quantidade invalida'], 400);
    $custo = to_number($data['custo'] ?? null, true);
    $precoVenda = to_number($data['precoVenda'] ?? null, true);
    if ($data['tipo'] === 'ENTRADA' && $data['motivo'] === 'COMPRA' && $custo === null) {
        respond(['error' => 'Custo unitario obrigatorio para compras'], 400);
    }
    if ($data['tipo'] === 'SAÍDA' && $data['motivo'] === 'VENDA' && $precoVenda === null) {
        respond(['error' => 'Preco de venda obrigatorio para vendas'], 400);
    }
    $stmt = $pdo->prepare('SELECT id FROM racoes WHERE sku = :sku');
    $stmt->execute([':sku' => $data['sku'] ?? '']);
    $racao = $stmt->fetch();
    if (!$racao) {
        respond(['error' => 'SKU inválido'], 400);
    }

    try {
        $stmt = $pdo->prepare('UPDATE movimentos SET data_movimento = :data_movimento, tipo = :tipo, motivo = :motivo, racao_id = :racao_id,
                               qtd_sacos = :qtd_sacos, custo_unitario = :custo_unitario, preco_venda_unitario = :preco_venda_unitario, observacoes = :observacoes
                               WHERE id = :id');
        $stmt->execute([
            ':data_movimento' => $data['data'] ?? date('Y-m-d'),
            ':tipo' => $data['tipo'] ?? 'ENTRADA',
            ':motivo' => $data['motivo'] ?? 'COMPRA',
            ':racao_id' => $racao['id'],
            ':qtd_sacos' => $qtd,
            ':custo_unitario' => $custo,
            ':preco_venda_unitario' => $precoVenda,
            ':observacoes' => $data['observacoes'] ?? null,
            ':id' => $id,
        ]);
        respond(['status' => 'ok']);
    } catch (Throwable $e) {
        respond(['error' => 'Nao foi possivel atualizar o movimento', 'details' => $e->getMessage()], 400);
    }
}

if ($parts[0] === 'movimentos' && isset($parts[1]) && $method === 'DELETE') {
    $id = (int)$parts[1];
    try {
        $stmt = $pdo->prepare('DELETE FROM movimentos WHERE id = :id');
        $stmt->execute([':id' => $id]);
        respond(['status' => 'ok']);
    } catch (Throwable $e) {
        respond(['error' => 'Nao foi possivel apagar o movimento', 'details' => $e->getMessage()], 400);
    }
}

respond(['error' => 'Endpoint não encontrado'], 404);
