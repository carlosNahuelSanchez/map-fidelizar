$ErrorActionPreference = 'Stop'
function Get-Sha256([string]$FilePath) {
  $algorithm = [System.Security.Cryptography.SHA256]::Create()
  try { return [BitConverter]::ToString($algorithm.ComputeHash([System.IO.File]::ReadAllBytes((Resolve-Path -LiteralPath $FilePath).Path))).Replace('-', '') }
  finally { $algorithm.Dispose() }
}
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$toolCache = Join-Path $env:USERPROFILE '.cache/map-fidelizar-android'
Set-Location -LiteralPath $projectRoot

if (-not $env:JAVA_HOME) {
  $cachedJava = Get-ChildItem -LiteralPath "$toolCache/java" -Directory -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($cachedJava) { $env:JAVA_HOME = $cachedJava.FullName }
}
if (-not $env:ANDROID_HOME -and (Test-Path -LiteralPath "$toolCache/sdk")) { $env:ANDROID_HOME = "$toolCache/sdk" }
if (-not $env:JAVA_HOME -or -not (Test-Path -LiteralPath "$env:JAVA_HOME/bin/keytool.exe")) { throw 'Configurá JAVA_HOME con un JDK 17 o superior. Consultá README.md.' }
if (-not $env:ANDROID_HOME -or -not (Test-Path -LiteralPath $env:ANDROID_HOME)) { throw 'Configurá ANDROID_HOME con tu Android SDK. Consultá README.md.' }
$socketDirectory = "$env:SystemDrive/fm-jtmp"
New-Item -ItemType Directory -Force -Path $socketDirectory | Out-Null
$env:JAVA_TOOL_OPTIONS = "$env:JAVA_TOOL_OPTIONS -Djava.net.preferIPv4Stack=true -Djdk.net.unixdomain.tmpdir=$socketDirectory".Trim()
$env:NODE_ENV = 'production'
$buildRoot = if ($env:FIDELIZAR_ANDROID_BUILD_ROOT) { $env:FIDELIZAR_ANDROID_BUILD_ROOT } else { "$env:SystemDrive/fma" }
$marker = Join-Path $buildRoot '.fidelizar-source'
if ((Test-Path -LiteralPath $buildRoot) -and (-not (Test-Path -LiteralPath $marker) -or (Get-Content -LiteralPath $marker -Raw).Trim() -ne $projectRoot)) {
  throw 'La carpeta corta de compilacion ya existe y pertenece a otro proyecto. Defini FIDELIZAR_ANDROID_BUILD_ROOT con una ruta corta libre.'
}
New-Item -ItemType Directory -Force -Path $buildRoot | Out-Null
$projectRoot | Set-Content -LiteralPath $marker
foreach ($name in @('package.json', 'package-lock.json', 'app.json', 'index.ts', 'App.tsx', 'tsconfig.json')) {
  Copy-Item -LiteralPath (Join-Path $projectRoot $name) -Destination $buildRoot -Force
}
foreach ($name in @('src', 'assets', 'plugins')) {
  $target = Join-Path $buildRoot $name
  New-Item -ItemType Directory -Force -Path $target | Out-Null
  Get-ChildItem -LiteralPath (Join-Path $projectRoot $name) | Copy-Item -Destination $target -Recurse -Force
}
if (Test-Path -LiteralPath (Join-Path $projectRoot '.env')) { Copy-Item -LiteralPath (Join-Path $projectRoot '.env') -Destination $buildRoot -Force }
Set-Location -LiteralPath $buildRoot
$lockHash = Get-Sha256 'package-lock.json'
$dependencyStamp = Join-Path $buildRoot '.dependencies.sha256'
if (-not (Test-Path -LiteralPath $dependencyStamp) -or (Get-Content -LiteralPath $dependencyStamp -Raw).Trim() -ne $lockHash) {
  & npm.cmd ci --no-audit --no-fund
  if ($LASTEXITCODE -ne 0) { throw 'No se pudieron instalar las dependencias de compilacion.' }
  $lockHash | Set-Content -LiteralPath $dependencyStamp
}
& npx.cmd expo prebuild --platform android --no-install
if ($LASTEXITCODE -ne 0) { throw 'Falló la generación del proyecto Android.' }

$credentialDirectory = Join-Path $projectRoot '.credentials'
New-Item -ItemType Directory -Force -Path $credentialDirectory | Out-Null
$settingsFile = Join-Path $credentialDirectory 'signing.json'
$keystoreFile = Join-Path $credentialDirectory 'fidelizar.keystore'
if (-not (Test-Path -LiteralPath $settingsFile)) {
  if (Test-Path -LiteralPath $keystoreFile) { throw 'Existe una firma sin su configuración. Recuperá signing.json antes de crear otra APK.' }
  @{ password = [guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N') } | ConvertTo-Json | Set-Content -LiteralPath $settingsFile -Encoding utf8
}
$signingSettings = Get-Content -LiteralPath $settingsFile -Raw | ConvertFrom-Json
$env:FIDELIZAR_KEYSTORE_PASSWORD = $signingSettings.password
$env:FIDELIZAR_KEYSTORE_FILE = $keystoreFile
try {
  if (-not (Test-Path -LiteralPath $keystoreFile)) {
    & "$env:JAVA_HOME/bin/keytool.exe" -genkeypair -keystore $keystoreFile -alias fidelizar -storepass:env FIDELIZAR_KEYSTORE_PASSWORD -keypass:env FIDELIZAR_KEYSTORE_PASSWORD -keyalg RSA -keysize 2048 -validity 10000 -dname 'CN=Fidelizar Prototype, OU=Equipo, O=Fidelizar, C=AR'
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo generar la firma local.' }
  }
  "sdk.dir=$($env:ANDROID_HOME.Replace('\', '/'))" | Set-Content -LiteralPath 'android/local.properties' -Encoding ascii
  Push-Location -LiteralPath 'android'
  try {
    & .\gradlew.bat :app:assembleRelease --no-daemon --max-workers=2 '-PreactNativeArchitectures=arm64-v8a,x86_64'
    if ($LASTEXITCODE -ne 0) { throw 'Falló la compilación de la APK.' }
  } finally { Pop-Location }
  $artifactDirectory = Join-Path $projectRoot 'artifacts'
  New-Item -ItemType Directory -Force -Path $artifactDirectory | Out-Null
  $artifact = Join-Path $artifactDirectory 'fidelizar.apk'
  Copy-Item -LiteralPath 'android/app/build/outputs/apk/release/app-release.apk' -Destination $artifact -Force
  Get-Sha256 $artifact | Set-Content -LiteralPath "$artifact.sha256"
  Write-Output 'APK lista: artifacts/fidelizar.apk'
} finally {
  Remove-Item Env:FIDELIZAR_KEYSTORE_PASSWORD -ErrorAction SilentlyContinue
  Remove-Item Env:FIDELIZAR_KEYSTORE_FILE -ErrorAction SilentlyContinue
  Set-Location -LiteralPath $projectRoot
}
