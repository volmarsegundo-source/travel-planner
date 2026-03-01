try {
    $tcp = New-Object Net.Sockets.TcpClient('127.0.0.1', 5432)
    $tcp.Close()
    Write-Host "Port 5432: OPEN"
} catch {
    Write-Host "Port 5432: CLOSED - $($_.Exception.Message)"
}

try {
    $tcp = New-Object Net.Sockets.TcpClient('127.0.0.1', 6379)
    $tcp.Close()
    Write-Host "Port 6379: OPEN"
} catch {
    Write-Host "Port 6379: CLOSED - $($_.Exception.Message)"
}
