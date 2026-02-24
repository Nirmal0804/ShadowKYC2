import zipfile
import os

def extract_app():
    zip_path = r'D:\edge_downloads\ShadowKYC2-main.zip'
    target_dir = r'D:\edge_downloads\shadowkyc-firstroundeva\ShadowKYC2_Restored'
    
    if not os.path.exists(target_dir):
        os.makedirs(target_dir)
        
    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
        for member in zip_ref.namelist():
            if member.startswith('ShadowKYC2-main/app/') or member.startswith('app/'):
                zip_ref.extract(member, target_dir)
                print(f"Extracted: {member}")

if __name__ == '__main__':
    extract_app()
