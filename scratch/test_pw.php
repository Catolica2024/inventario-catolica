<?php
require_once __DIR__ . '/../includes/db.php';

$users = db()->query('SELECT email, password_hash FROM usuarios')->fetchAll();
$passwords = ['admin123', 'admin', '123456', '12345678', 'catolica', 'pepe', 'pepe123', 'Fernando', 'Victor', 'Yunner', 'María', 'almacen', 'lacatolica'];

foreach ($users as $u) {
    foreach ($passwords as $pw) {
        if (password_verify($pw, $u['password_hash'])) {
            echo "User: " . $u['email'] . " -> Password: " . $pw . "\n";
        }
    }
}
