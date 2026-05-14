@echo off
chcp 65001 > nul
title 重新构建并启动 - MuYunAPI

echo.
echo  ╔══════════════════════════════════════╗
echo  ║    MuYunAPI 重新构建并启动          ║
echo  ╚══════════════════════════════════════╝
echo.

:: 1. 终止3000端口进程
echo [1/3] 终止3000端口进程...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do (
    echo  终止进程 %%a
    taskkill /F /PID %%a > nul 2>&1
)
timeout /t 2 > nul

:: 2. 构建前端
echo.
echo [2/3] 构建前端...
cd /d "%~dp0client"
call npm run build
if errorlevel 1 (
    echo  前端构建失败！
    pause
    exit /b 1
)

:: 3. 启动后端服务
echo.
echo [3/3] 启动后端服务...
cd /d "%~dp0server"
start "MuYunAPI-Server" cmd /k "node index.js"

echo.
echo  ═══════════════════════════════════════
echo   部署完成！
echo   访问地址: http://localhost:3000
echo  ═══════════════════════════════════════
echo.
