# PowerShell script to test the API endpoint
# Usage: .\test-api.ps1 -ApiKey "sk_your_key_here"

param(
    [Parameter(Mandatory=$true)]
    [string]$ApiKey,
    
    [string]$Message = "Hello, how are you?",
    [string]$BaseUrl = "http://localhost:3000"
)

Write-Host "Testing API endpoint: $BaseUrl/api/v1/chat" -ForegroundColor Cyan
Write-Host "API Key: $($ApiKey.Substring(0, [Math]::Min(20, $ApiKey.Length)))..." -ForegroundColor Gray
Write-Host ""

try {
    $headers = @{
        "Authorization" = "Bearer $ApiKey"
        "Content-Type" = "application/json"
    }
    
    $body = @{
        message = $Message
        conversation_history = @()
        temperature = 0.7
        max_tokens = 200
    } | ConvertTo-Json
    
    Write-Host "Sending request..." -ForegroundColor Yellow
    
    $response = Invoke-RestMethod -Uri "$BaseUrl/api/v1/chat" -Method POST -Headers $headers -Body $body
    
    Write-Host "✅ Success!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Response:" -ForegroundColor Cyan
    Write-Host ($response | ConvertTo-Json -Depth 10)
    
} catch {
    Write-Host "❌ Error occurred!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Yellow
    Write-Host "Error Message: $($_.Exception.Message)" -ForegroundColor Yellow
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body: $responseBody" -ForegroundColor Yellow
    }
}
