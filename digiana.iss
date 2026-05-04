; ============================================================
;  DigIAna - Inno Setup Script
;  Pre-requisitos antes de compilar:
;    1. python build.py                    -> gera dist\extension\
;    2. engine\llama-server.exe            -> binario do llama.cpp (Windows)
;    3. engine\qwen2.5-3b-instruct-q4_k_m.gguf -> modelo quantizado (~1.9 GB)
;    4. redist\vc_redist.x64.exe           -> Visual C++ Redistributable 2022 x64
; ============================================================

#define AppName    "DigIAna"
#define AppVersion "2.0"
#define AppPublisher "Edilson Monteiro"
#define ExtDir     "dist\extension"
#define EngineDir  "engine"

[Setup]
AppId={{E4A2B3C1-7F5D-4E8A-9B2C-3D6F1A0E5C4B}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher={#AppPublisher}
AppVerName={#AppName} {#AppVersion}
DefaultDirName={localappdata}\DigIAna
DisableDirPage=yes
DefaultGroupName={#AppName}
DisableProgramGroupPage=yes
OutputDir=dist
OutputBaseFilename=DigIAna_Setup_{#AppVersion}
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=lowest
UninstallDisplayName={#AppName}
UninstallDisplayIcon={app}\icons\icon128.png
WizardImageFile=Banner_lateral.png
WizardSmallImageFile=logo_pequena.png

AppComments=IA local (Qwen 2.5 3B) para suporte em tempo real.
AppContact={#AppPublisher}

[Languages]
Name: "brazilianportuguese"; MessagesFile: "compiler:Languages\BrazilianPortuguese.isl"

[Files]
Source: "{#ExtDir}\manifest.json";        DestDir: "{app}";          Flags: ignoreversion
Source: "{#ExtDir}\background.js";        DestDir: "{app}";          Flags: ignoreversion

Source: "{#ExtDir}\popup\popup.html";     DestDir: "{app}\popup";    Flags: ignoreversion
Source: "{#ExtDir}\popup\popup.js";       DestDir: "{app}\popup";    Flags: ignoreversion

Source: "{#ExtDir}\content\content.js";   DestDir: "{app}\content";  Flags: ignoreversion
Source: "{#ExtDir}\content\styles.css";   DestDir: "{app}\content";  Flags: ignoreversion

Source: "{#ExtDir}\icons\icon16.png";     DestDir: "{app}\icons";    Flags: ignoreversion
Source: "{#ExtDir}\icons\icon48.png";     DestDir: "{app}\icons";    Flags: ignoreversion
Source: "{#ExtDir}\icons\icon128.png";    DestDir: "{app}\icons";    Flags: ignoreversion

Source: "{#EngineDir}\llama-server.exe";       DestDir: "{app}\engine"; Flags: ignoreversion
Source: "{#EngineDir}\*.dll";                  DestDir: "{app}\engine"; Flags: ignoreversion
Source: "{#EngineDir}\qwen2.5-3b-instruct-q4_k_m.gguf";   DestDir: "{app}\engine"; Flags: ignoreversion
Source: "{#EngineDir}\start_server.bat";       DestDir: "{app}\engine"; Flags: ignoreversion
Source: "{#EngineDir}\wake_server.ps1";        DestDir: "{app}\engine"; Flags: ignoreversion

Source: "redist\vc_redist.x64.exe"; DestDir: "{tmp}"; Flags: deleteafterinstall

[Run]
Filename: "{tmp}\vc_redist.x64.exe"; \
  Parameters: "/quiet /norestart"; \
  StatusMsg: "Instalando componentes necessarios (VC++ Runtime)..."; \
  Check: NeedsVCRedist; \
  Flags: waituntilterminated

[Registry]
Root: HKCU; Subkey: "Software\Classes\digiana-start"; ValueType: string; ValueName: ""; ValueData: "URL:DigIAna Protocol"; Flags: uninsdeletekey
Root: HKCU; Subkey: "Software\Classes\digiana-start"; ValueType: string; ValueName: "URL Protocol"; ValueData: ""
Root: HKCU; Subkey: "Software\Classes\digiana-start\shell\open\command"; ValueType: expandsz; ValueName: ""; ValueData: "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File ""%LOCALAPPDATA%\DigIAna\engine\wake_server.ps1"" %1"

[UninstallDelete]
Type: filesandordirs; Name: "{app}"

[Icons]
Name: "{group}\Configurar {#AppName}"; \
      Filename: "{code:GetChromePath}"; \
      Parameters: "chrome://extensions/"; \
      IconFilename: "{app}\icons\icon128.png"; \
      Comment: "Abre o gerenciador de extensoes do Chrome"

Name: "{group}\Desinstalar {#AppName}"; \
      Filename: "{uninstallexe}"

[Code]

function NeedsVCRedist: Boolean;
var Installed: Cardinal;
begin
  Result := not RegQueryDWordValue(HKLM,
    'SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\x64',
    'Installed', Installed) or (Installed <> 1);
end;

function GetChromePath(Param: String): String;
var Path: String;
begin
  Path := ExpandConstant('{localappdata}\Google\Chrome\Application\chrome.exe');
  if FileExists(Path) then begin Result := Path; Exit; end;

  Path := 'C:\Program Files\Google\Chrome\Application\chrome.exe';
  if FileExists(Path) then begin Result := Path; Exit; end;

  Path := 'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe';
  if FileExists(Path) then begin Result := Path; Exit; end;

  if RegQueryStringValue(HKCU,
    'Software\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe', '', Path) then
    if FileExists(Path) then begin Result := Path; Exit; end;

  if RegQueryStringValue(HKLM,
    'SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe', '', Path) then
    if FileExists(Path) then begin Result := Path; Exit; end;

  Result := '';
end;

procedure CopyToClipboard(const Text: String);
var ResultCode: Integer;
begin
  Exec('powershell.exe',
    '-NoProfile -NonInteractive -Command "Set-Clipboard -Value ''' + Text + '''"',
    '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
end;

procedure OpenChromeExtensions();
var
  ChromePath: String;
  ResultCode: Integer;
begin
  ChromePath := GetChromePath('');
  if ChromePath <> '' then
    Exec(ChromePath, 'chrome://extensions/', '', SW_SHOWNORMAL, ewNoWait, ResultCode)
  else
    MsgBox('Chrome nao encontrado.' + #13#10 +
           'Abra o Chrome e acesse: chrome://extensions/', mbInformation, MB_OK);
end;

procedure CreateStartupTask();
var
  BatchFile : String;
  ResultCode: Integer;
begin
  BatchFile := ExpandConstant('{app}\engine\start_server.bat');

  Exec('schtasks.exe', '/Delete /TN "DigIAnaServer" /F',
       '', SW_HIDE, ewWaitUntilTerminated, ResultCode);

  Exec('schtasks.exe',
       '/Create /TN "DigIAnaServer"' +
       ' /TR "cmd /c \"\"' + BatchFile + '\"\""' +
       ' /SC ONLOGON /RL LIMITED /F',
       '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
end;

procedure StartServer();
var
  EngineDir : String;
  ResultCode: Integer;
begin
  EngineDir := ExpandConstant('{app}\engine');
  Exec('cmd.exe',
       '/c start "" /B start_server.bat',
       EngineDir, SW_HIDE, ewNoWait, ResultCode);
end;

procedure CurStepChanged(CurStep: TSetupStep);
var Msg: String;
begin
  if CurStep = ssPostInstall then
  begin
    CreateStartupTask();
    StartServer();
    CopyToClipboard(ExpandConstant('{app}'));

    Msg :=
      'Instalacao concluida!' + #13#10#13#10 +
      'Para ativar a extensao no Chrome:' + #13#10 +
      ' 1. Ative o "Modo do desenvolvedor" (canto superior direito)' + #13#10 +
      ' 2. Clique em "Carregar sem compactacao"' + #13#10 +
      ' 3. Pressione Ctrl+V e clique em "Selecionar pasta"' + #13#10#13#10 +
      'O servidor de IA foi configurado para iniciar com o Windows.' + #13#10 +
      'Recomendamos REINICIAR o computador apos concluir.';
    MsgBox(Msg, mbInformation, MB_OK);

    OpenChromeExtensions();
  end;
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
var ResultCode: Integer;
begin
  if CurUninstallStep = usPostUninstall then
    Exec('schtasks.exe', '/Delete /TN "DigIAnaServer" /F',
         '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
end;
