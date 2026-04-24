@echo off
cd /d "C:\Users\Nick\Downloads\Marketing"
echo [%date% %time%] Iniciando coleta de vendas diarias >> logs\vendas-diarias.log
node tools\preencher-vendas-diarias.js >> logs\vendas-diarias.log 2>&1
echo [%date% %time%] Coleta finalizada >> logs\vendas-diarias.log
