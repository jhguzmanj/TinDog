@echo off
rem Abre el entrenador de piano en Chrome o Edge (necesario para MIDI). Dejalo en la misma carpeta que piano-midi-trainer.html
set "F=%~dp0piano-midi-trainer.html"
if not exist "%F%" (echo No encuentro piano-midi-trainer.html junto a este archivo. & pause & exit /b 1)
where chrome >nul 2>nul && (start "" chrome "%F%" & exit /b 0)
where msedge >nul 2>nul && (start "" msedge "%F%" & exit /b 0)
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" "%F%" & exit /b 0)
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" "%F%" & exit /b 0)
echo No encontre Chrome ni Edge. Firefox no soporta MIDI.
pause
