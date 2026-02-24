import os

def find_auth_files():
    for root, dirs, files in os.walk('D:\\'):
        if 'auth.py' in files:
            path = os.path.join(root, 'auth.py')
            try:
                size = os.path.getsize(path)
                print(f"{path}: {size}")
            except:
                pass

if __name__ == '__main__':
    find_auth_files()
