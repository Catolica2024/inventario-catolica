<?php
require_once __DIR__ . '/../includes/db.php';
$pdo = db();

$item_id = 2; // COM-0001 huérfano

// 1. Eliminar movimientos vinculados
$mov = $pdo->prepare("DELETE FROM movimientos WHERE item_id = ?");
$mov->execute([$item_id]);
echo "Movimientos eliminados: " . $mov->rowCount() . "\n";

// 2. Eliminar activos vinculados (por si acaso)
$act = $pdo->prepare("DELETE FROM activos WHERE item_id = ?");
$act->execute([$item_id]);
echo "Activos eliminados: " . $act->rowCount() . "\n";

// 3. Eliminar el ítem
$itm = $pdo->prepare("DELETE FROM items WHERE id = ?");
$itm->execute([$item_id]);
echo "Ítem COM-0001 eliminado: " . $itm->rowCount() . "\n";

echo "\nOK: La base de datos está limpia. El próximo registro recibirá COM-0001.\n";
