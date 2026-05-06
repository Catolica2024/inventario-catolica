<?php
// test_api.php
function test($url, $method = 'GET', $data = null) {
    echo "Testing $method $url... ";
    $options = [
        'http' => [
            'method' => $method,
            'header' => 'Content-Type: application/json',
            'content' => $data ? json_encode($data) : null,
            'ignore_errors' => true
        ]
    ];
    $context = stream_context_create($options);
    $result = file_get_contents($url, false, $context);
    echo $result . "\n\n";
    return json_decode($result, true);
}

$base = "http://localhost/inventario-catolica/api/";

// 1. Get Items
test($base . "items.php");

// 2. Create Item
$newItem = test($base . "items.php", "POST", ["nombre" => "Test Item API", "codigo" => "T-API", "stock_minimo" => 5]);

if (isset($newItem['id'])) {
    // 3. Update Item
    test($base . "items.php", "PUT", ["id" => $newItem['id'], "nombre" => "Test Item Updated", "stock_minimo" => 10]);
    
    // 4. Delete Item
    test($base . "items.php?id=" . $newItem['id'], "DELETE");
}

// 5. Get Categories
test($base . "categories.php");
