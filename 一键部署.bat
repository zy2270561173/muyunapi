@echo off
chcp 65001 > nul
title 一键部署 - MuYunAPI

echo.
echo  ╔══════════════════════════════════════╗
echo  ║    MuYunAPI 一键部署                 ║
echo  ╚══════════════════════════════════════╝
echo.

:: 检查端口占用
echo [1/4] 检查端口占用...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do (
    echo  终止进程 %%a
    taskkill /F /PID %%a > nul 2>&1
)

:: 构建前端
echo.
echo [2/4] 构建前端...
cd /d "%~dp0client"
call npm run build
if errorlevel 1 (
    echo  前端构建失败！
    pause
    exit /b 1
)

:: 启动后端服务
echo.
echo [3/4] 启动后端服务...
cd /d "%~dp0server"
start "MuYunAPI-Backend" cmd /k "node index.js"

:: 启动前端静态服务
echo.
echo [4/4] 启动前端静态服务...
start "MuYunAPI-Frontend" cmd /k "cd /d \"%~dp0client\dist\" ^&^& python -m http.server 3000"

echo.
echo  ╔══════════════════════════════════════╗
echo  ║    部署完成！                        ║
echo  ║    前端: http://localhost:3000       ║
echo  ║    后端: http://localhost:3001       ║
echo  ╚══════════════════════════════════════╝
echo.
pause
