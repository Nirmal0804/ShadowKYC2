import os
import glob

def fix_arrows():
    files = glob.glob('app/**/*.py', recursive=True)
    for f in files:
        if not os.path.isfile(f):
            continue
        
        # Read fully before opening for write
        with open(f, 'rb') as fr:
            content = fr.read()
        
        new_content = content.replace(b'\xe2\x86\x92', b'->')
        
        if new_content != content:
            with open(f, 'wb') as fw:
                fw.write(new_content)
            print(f"Fixed: {f}")

if __name__ == '__main__':
    fix_arrows()
