$i=0
while ($i -lt 30) {
    docker info 2>$null | Out-Null
    if ($?) { break }
    Start-Sleep -Seconds 2
    $i++
}
docker compose down -v
docker compose up -d
