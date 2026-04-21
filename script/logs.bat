@echo off
REM ============================================================================
REM BelezaEcosystem - Script para Ver Logs
REM ============================================================================

echo.
echo ========================================
echo  BelezaEcosystem - Logs em Tempo Real
echo ========================================
echo.
echo Pressione Ctrl+C para sair
echo.

docker-compose logs -f backend
