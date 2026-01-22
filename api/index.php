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
    $stmt = $pdo->query('SELECT m.id, m.data_movimento, m.tipo, m.motivo, r.sku, m.qtd_sacos, m.custo_unitario, m.preco_venda_unitario
                         FROM movimentos m
                         JOIN racoes r ON r.id = m.racao_id
                         ORDER BY m.data_movimento DESC, m.id DESC
                         LIMIT 200');
    respond($stmt->fetchAll());
}

if ($path === '/dashboard' && $method === 'GET') {
    $stmt = $pdo->query('SELECT * FROM vw_dashboard');
    $row = $stmt->fetch();
    $row['last_updated'] = date('c');
    respond($row ?: ['valor_em_stock' => 0, 'total_compras' => 0, 'total_vendas' => 0, 'lucro_estimado' => 0, 'last_updated' => date('c')]);
}

if ($path === '/racoes' && $method === 'POST') {
    $data = json_body();
    try {
        $stmt = $pdo->prepare('INSERT INTO racoes (sku, nome, marca, variante, peso_kg, fornecedor, preco_venda, stock_minimo, ativo)
                               VALUES (:sku, :nome, :marca, :variante, :peso_kg, :fornecedor, :preco_venda, :stock_minimo, :ativo)');
        $stmt->execute([
            ':sku' => $data['sku'] ?? '',
            ':nome' => $data['nome'] ?? '',
            ':marca' => $data['marca'] ?? '',
            ':variante' => $data['variante'] ?? null,
            ':peso_kg' => $data['pesoKg'] ?? 0,
            ':fornecedor' => $data['fornecedor'] ?? null,
            ':preco_venda' => $data['precoVenda'] ?? 0,
            ':stock_minimo' => $data['stockMin'] ?? 0,
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
    try {
        $stmt = $pdo->prepare('UPDATE racoes SET sku = :sku, nome = :nome, marca = :marca, variante = :variante, peso_kg = :peso_kg,
                               fornecedor = :fornecedor, preco_venda = :preco_venda, stock_minimo = :stock_minimo, ativo = :ativo
                               WHERE id = :id');
        $stmt->execute([
            ':sku' => $data['sku'] ?? '',
            ':nome' => $data['nome'] ?? '',
            ':marca' => $data['marca'] ?? '',
            ':variante' => $data['variante'] ?? null,
            ':peso_kg' => $data['pesoKg'] ?? 0,
            ':fornecedor' => $data['fornecedor'] ?? null,
            ':preco_venda' => $data['precoVenda'] ?? 0,
            ':stock_minimo' => $data['stockMin'] ?? 0,
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
            ':qtd_sacos' => (int)($data['qtd'] ?? 0),
            ':custo_unitario' => $data['custo'] ?? null,
            ':preco_venda_unitario' => $data['precoVenda'] ?? null,
            ':observacoes' => $data['observacoes'] ?? null,
        ]);

        respond(['status' => 'ok', 'id' => $pdo->lastInsertId()], 201);
    } catch (Throwable $e) {
        respond(['error' => 'Nao foi possivel criar o movimento', 'details' => $e->getMessage()], 400);
    }
}

respond(['error' => 'Endpoint não encontrado'], 404);
