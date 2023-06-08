@echo off
set chrome_path="C:\Program Files\Google\Chrome\Application\chrome.exe"
set flags=--disable-web-security --user-data-dir="C:/ChromeDevSession"
set html_file=%cd%\index.html

start "" %chrome_path% %flags% %html_file%
