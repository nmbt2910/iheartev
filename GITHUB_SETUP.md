# Hướng dẫn push project lên GitHub

## Bước 1: Tạo repository trên GitHub

1. Truy cập: https://github.com/new
2. Điền thông tin:
   - **Repository name**: `iheartev` (hoặc tên bạn muốn)
   - **Description**: `Second-hand EV & Battery Trading Platform with AI-powered features`
   - **Visibility**: Public hoặc Private (tùy chọn)
   - **KHÔNG** check "Initialize this repository with a README" (vì đã có)
3. Click **Create repository**

## Bước 2: Push code lên GitHub

Sau khi tạo repository, chạy các lệnh sau trong terminal:

```powershell
cd "C:\Users\ASUS\Documents\FPT\MMA301\iheartev"

# Thêm remote repository (thay YOUR_USERNAME bằng username GitHub của bạn)
git remote add origin https://github.com/YOUR_USERNAME/iheartev.git

# Đổi tên branch thành main (nếu GitHub dùng main thay vì master)
git branch -M main

# Push code lên GitHub
git push -u origin main
```

Nếu bạn muốn dùng SSH thay vì HTTPS:
```powershell
git remote add origin git@github.com:YOUR_USERNAME/iheartev.git
git push -u origin main
```

## Lưu ý

- Nhớ thay `YOUR_USERNAME` bằng username GitHub thực tế của bạn
- Nếu repository của bạn tên khác, thay `iheartev` trong URL bằng tên repository của bạn
- Nếu GitHub hỏi authentication, bạn có thể:
  - Sử dụng Personal Access Token (PAT) thay cho password
  - Hoặc cấu hình SSH keys

