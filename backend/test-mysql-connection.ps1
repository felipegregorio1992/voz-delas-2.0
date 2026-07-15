# Script para testar conexão MySQL

Write-Host "=== Testando Conexão MySQL ===" -ForegroundColor Green

$hostname = "localhost"
$port = 3306
$database = "vozdelas"
$username = "root"

Write-Host "`nTentando conectar em: $username@${hostname}:$port" -ForegroundColor Yellow

# Solicitar senha
$securePassword = Read-Host "Digite a senha do MySQL (ou pressione Enter para 'root')" -AsSecureString
if ($securePassword.Length -eq 0) {
    $password = "root"
} else {
    $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
    $password = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
}

# Testar conexão
try {
    $connectionString = "server=$hostname;port=$port;user=$username;password=$password"
    $connection = New-Object MySql.Data.MySqlClient.MySqlConnection($connectionString)
    $connection.Open()
    
    Write-Host "✓ Conexão bem-sucedida!" -ForegroundColor Green
    
    # Verificar se o banco existe
    $command = $connection.CreateCommand()
    $command.CommandText = "SHOW DATABASES LIKE '$database'"
    $reader = $command.ExecuteReader()
    
    if ($reader.Read()) {
        Write-Host "✓ Banco '$database' já existe" -ForegroundColor Green
    } else {
        Write-Host "⚠ Banco '$database' não existe. Criando..." -ForegroundColor Yellow
        $reader.Close()
        $command.CommandText = "CREATE DATABASE IF NOT EXISTS $database CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
        $command.ExecuteNonQuery()
        Write-Host "✓ Banco '$database' criado!" -ForegroundColor Green
    }
    
    $connection.Close()
    
    Write-Host "`n=== Atualizando .env ===" -ForegroundColor Green
    $envContent = Get-Content .env -Raw
    $newDatabaseUrl = "DATABASE_URL=`"mysql://$username`:$password@$hostname`:$port/$database?schema=public`""
    
    if ($envContent -match 'DATABASE_URL=".*"') {
        $envContent = $envContent -replace 'DATABASE_URL=".*"', $newDatabaseUrl
    } else {
        $envContent += "`n$newDatabaseUrl"
    }
    
    Set-Content .env -Value $envContent
    Write-Host "✓ Arquivo .env atualizado!" -ForegroundColor Green
    
    Write-Host "`n=== Próximos passos ===" -ForegroundColor Green
    Write-Host "1. Execute: npx prisma migrate dev --name init" -ForegroundColor Yellow
    Write-Host "2. Execute: npx prisma db seed" -ForegroundColor Yellow
    Write-Host "3. Execute: npm run start:dev" -ForegroundColor Yellow
    
} catch {
    Write-Host "✗ Erro ao conectar: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "`nVerifique:" -ForegroundColor Yellow
    Write-Host "- Se o MySQL está rodando" -ForegroundColor Yellow
    Write-Host "- Se a senha está correta" -ForegroundColor Yellow
    Write-Host "- Se o usuário tem permissões" -ForegroundColor Yellow
}

