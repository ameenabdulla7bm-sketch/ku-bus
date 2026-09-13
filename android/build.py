#!/usr/bin/env python3
"""Build a signed KU Bus APK using the official SDK command-line build tools."""
import argparse
import hashlib
import os
from pathlib import Path
import secrets
import shutil
import subprocess
import zipfile

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--java-home', required=True, type=Path)
parser.add_argument('--build-tools', required=True, type=Path)
parser.add_argument('--android-jar', required=True, type=Path)
parser.add_argument('--site', required=True, type=Path)
parser.add_argument('--signing-dir', required=True, type=Path,
                    help='Private directory OUTSIDE the website and Git repository')
parser.add_argument('--output', required=True, type=Path)
args = parser.parse_args()
project = Path(__file__).resolve().parent
site = args.site.resolve()
private = args.signing_dir.resolve()
if private == site or site in private.parents or private == project or project in private.parents:
    parser.error('Signing keys must be outside both the website and Android source directories.')
build = project / 'build'
build.mkdir(exist_ok=True)
env = os.environ.copy()
env['JAVA_HOME'] = str(args.java_home.resolve())
env['PATH'] = str(args.java_home.resolve() / 'bin') + os.pathsep + env.get('PATH', '')
java = args.java_home.resolve() / 'bin'
tools = args.build_tools.resolve()
android = args.android_jar.resolve()

def run(*command):
    subprocess.run([str(arg) for arg in command], check=True, env=env)

private.mkdir(parents=True, exist_ok=True, mode=0o700)
keystore = private / 'ku-bus-release.p12'
password = private / 'keystore-password.txt'
if not keystore.exists():
    if password.exists():
        raise SystemExit('Password file exists without its keystore; restore the keystore before building.')
    password.write_text(secrets.token_urlsafe(40))
    password.chmod(0o600)
    run(java / 'keytool', '-genkeypair', '-keystore', keystore, '-storetype', 'PKCS12',
        '-storepass:file', password, '-alias', 'ku-bus-release', '-keyalg', 'RSA',
        '-keysize', '3072', '-validity', '10000', '-dname', 'CN=KU Bus Release', '-noprompt')
    keystore.chmod(0o600)
elif not password.exists():
    raise SystemExit('Missing signing password file. Restore it; do not replace the existing signing identity.')

# Only public runtime assets go inside the APK. The APK itself is never bundled recursively.
assets = build / 'assets' / 'site'
if assets.exists():
    shutil.rmtree(assets)
assets.mkdir(parents=True)
for name in ['index.html', 'fonts.css', 'mobile.css', 'airline.css', 'script.js',
             'navigation.js', 'manifest.webmanifest']:
    shutil.copy2(site / name, assets / name)
for name in ['assets', 'documents']:
    shutil.copytree(site / name, assets / name)
classes = build / 'classes'
dex = build / 'dex'
for folder in [classes, dex]:
    if folder.exists():
        shutil.rmtree(folder)
    folder.mkdir()
compiled = build / 'resources.zip'
unsigned = build / 'unsigned.apk'
aligned = build / 'aligned.apk'
for file in [compiled, unsigned, aligned]:
    file.unlink(missing_ok=True)
run(tools / 'aapt2', 'compile', '--dir', project / 'res', '-o', compiled)
run(tools / 'aapt2', 'link', '-o', unsigned, '--manifest', project / 'AndroidManifest.xml',
    '-I', android, '-R', compiled, '-A', build / 'assets', '--auto-add-overlay')
run(java / 'javac', '--release', '8', '-encoding', 'UTF-8',
    '-classpath', android, '-d', classes, *sorted((project / 'src').rglob('*.java')))
run(tools / 'd8', '--release', '--min-api', '26', '--lib', android,
    '--output', dex, *sorted(classes.rglob('*.class')))
with zipfile.ZipFile(unsigned, 'a', zipfile.ZIP_DEFLATED) as archive:
    for file in dex.glob('*.dex'):
        archive.write(file, file.name)
run(tools / 'zipalign', '-f', '4', unsigned, aligned)
output = args.output.resolve()
output.parent.mkdir(parents=True, exist_ok=True)
run(tools / 'apksigner', 'sign', '--ks', keystore, '--ks-key-alias', 'ku-bus-release',
    '--ks-pass', 'file:' + str(password), '--v1-signing-enabled', 'true',
    '--v2-signing-enabled', 'true', '--v3-signing-enabled', 'true',
    '--v4-signing-enabled', 'false', '--out', output, aligned)
run(tools / 'zipalign', '-c', '-v', '4', output)
run(tools / 'apksigner', 'verify', '--verbose', '--print-certs', output)
digest = hashlib.sha256(output.read_bytes()).hexdigest()
output.with_suffix('.apk.sha256').write_text(digest + '  ' + output.name + '\n')
print('Signed APK:', output)
print('SHA-256:', digest)
print('Keep the signing directory private and back it up:', private)
