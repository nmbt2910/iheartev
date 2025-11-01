# iHeartEV - Second-hand EV & Battery Trading Platform

Một nền tảng thương mại điện tử cho phép người dùng mua bán xe điện và pin đã qua sử dụng, được tích hợp với AI để đánh giá và đề xuất giá cả.

## 📋 Mục lục

- [Tính năng](#tính-năng)
- [Công nghệ sử dụng](#công-nghệ-sử-dụng)
- [Cài đặt](#cài-đặt)
- [Cấu hình](#cấu-hình)
- [Chạy ứng dụng](#chạy-ứng-dụng)
- [API Documentation](#api-documentation)

## ✨ Tính năng

### Backend (Spring Boot)

#### Xác thực và Phân quyền
- ✅ Đăng ký và đăng nhập người dùng
- ✅ JWT-based authentication
- ✅ Phân quyền Admin/Member
- ✅ Validate token và tự động logout khi hết hạn

#### Quản lý Tin đăng (Listings)
- ✅ Tạo, sửa, xóa tin đăng
- ✅ Tìm kiếm và lọc tin đăng (theo hãng, năm, giá, dung lượng pin)
- ✅ Trạng thái tin đăng (ACTIVE, DRAFT, SOLD)
- ✅ Hỗ trợ cả EV và Battery

#### AI Integration
- ✅ Đánh giá AI tổng quát về xe điện (sử dụng Gemini API)
- ✅ Đề xuất giá cả bằng AI
- ✅ Fallback tự động giữa nhiều mô hình Gemini
- ✅ Format và hiển thị text đẹp mắt

#### Tương tác Xã hội
- ✅ Yêu thích (Favorites) - đồng bộ real-time
- ✅ Đánh giá và nhận xét
- ✅ Kiểm tra trạng thái yêu thích

#### Giao dịch
- ✅ Tạo đơn hàng (Buy Now)
- ✅ Quản lý đơn hàng (PENDING, PAID, CANCELLED)

#### Quản trị viên
- ✅ Xác minh tin đăng
- ✅ Xem báo cáo tổng quan
- ✅ Quản lý người dùng

### Mobile App (React Native + Expo)

#### Xác thực
- ✅ Màn hình đăng nhập/đăng ký đẹp mắt
- ✅ Tự động kiểm tra và validate token
- ✅ Session expired handling với thông báo rõ ràng
- ✅ Bảo vệ routes với authentication guard

#### Trang chủ (Home)
- ✅ Danh sách xe với search real-time (debounced)
- ✅ Bộ lọc: năm sản xuất, giá, dung lượng pin
- ✅ Hiển thị trạng thái yêu thích
- ✅ Pull to refresh
- ✅ UI/UX hiện đại, minimalist

#### Chi tiết Xe (Listing Detail)
- ✅ **Đánh giá AI** - Tính năng chính:
  - Tự động load khi vào trang
  - Format text đẹp (headings, numbered lists, paragraphs)
  - Expand/Collapse để kiểm soát độ dài nội dung
  - Tự động loại bỏ markdown formatting
- ✅ Thông tin chi tiết xe
- ✅ Nút yêu thích đồng bộ real-time
- ✅ Mua ngay

#### Quản lý Cá nhân
- ✅ Tin đăng của tôi
- ✅ Đơn hàng của tôi
- ✅ Danh sách yêu thích

#### Tạo Tin đăng
- ✅ Form tạo tin với validation
- ✅ AI price suggestion
- ✅ UI/UX professional

#### Quản trị (Admin)
- ✅ Dashboard quản trị
- ✅ Xác minh tin đăng

## 🛠 Công nghệ sử dụng

### Backend
- **Framework**: Spring Boot 3.5.7
- **Database**: SQL Server
- **ORM**: Spring Data JPA / Hibernate
- **Security**: Spring Security + JWT
- **AI**: Google Gemini API (gemini-2.0-flash-lite)
- **API Docs**: Swagger/OpenAPI
- **Build Tool**: Maven

### Mobile
- **Framework**: React Native (Expo)
- **Navigation**: React Navigation
- **State Management**: Zustand
- **HTTP Client**: Axios
- **Storage**: AsyncStorage
- **UI Components**: React Native Components + Material Community Icons

## 📦 Cài đặt

### Yêu cầu
- Java 17+
- Maven 3.6+
- Node.js 16+
- SQL Server
- Expo CLI (`npm install -g expo-cli`)

### Backend

```bash
cd backend
mvn clean install
```

### Mobile

```bash
cd mobile
npm install
```

## ⚙️ Cấu hình

### Backend Environment Variables

Tạo file `.env` trong thư mục `backend` hoặc set environment variables:

```powershell
# PowerShell
$env:DB_URL="jdbc:sqlserver://localhost:1433;databaseName=iheartev;trustServerCertificate=true"
$env:DB_USER="sa"
$env:DB_PASSWORD="12345"
$env:GEMINI_API_KEY="your_gemini_api_key_here"
$env:JWT_SECRET="dGhpcyBpcyBhIHNlY3JldCBrZXkgZm9yIGp3dCB0b2tlbiBzaWduaW5nIGFuZCB2ZXJpZmljYXRpb24="
```

### Mobile Environment Variables

```powershell
# Set API URL (for Android Emulator)
setx EXPO_PUBLIC_API_URL "http://10.0.2.2:3000"

# For iOS Simulator or Physical Device
setx EXPO_PUBLIC_API_URL "http://localhost:3000"
# or
setx EXPO_PUBLIC_API_URL "http://your-local-ip:3000"
```

## 🚀 Chạy ứng dụng

### Backend

```bash
cd backend
./mvnw spring-boot:run
# hoặc
mvn spring-boot:run
```

Backend sẽ chạy tại: `http://localhost:3000`

### Mobile

```bash
cd mobile
npm start
# hoặc
npm run android  # Cho Android
npm run ios      # Cho iOS
npm run web      # Cho Web
```

## 📚 API Documentation

Sau khi backend chạy, truy cập Swagger UI tại:
- **URL**: `http://localhost:3000/swagger-ui.html`
- **OpenAPI Docs**: `http://localhost:3000/v3/api-docs`

## 🔐 Test Accounts

Mật khẩu cho tất cả test accounts: `Password123!`

**Admin:**
- Email: `admin@iheartev.com`
- Password: `Password123!`

**Member:**
- Email: `member1@iheartev.com` đến `member5@iheartev.com`
- Password: `Password123!`

## 📱 Tính năng nổi bật

### AI-Powered Analysis
- Tự động phân tích và đánh giá xe điện
- So sánh giá với thị trường
- Đưa ra lời khuyên hữu ích
- Format text đẹp mắt, dễ đọc

### Real-time Synchronization
- Đồng bộ trạng thái yêu thích giữa các màn hình
- Auto-refresh khi quay lại màn hình
- Session management thông minh

### Modern UI/UX
- Thiết kế minimalist, professional
- Smooth animations và transitions
- Responsive và user-friendly
- Dark/Light theme support (StatusBar)

## 🔧 Cấu trúc Project

```
iheartev/
├── backend/          # Spring Boot Backend
│   ├── src/
│   │   └── main/
│   │       ├── java/...    # Source code
│   │       └── resources/  # Config files
│   └── pom.xml
│
├── mobile/           # React Native Mobile App
│   ├── src/
│   │   ├── screens/       # Screen components
│   │   ├── services/      # API services
│   │   ├── store/         # State management
│   │   └── hooks/         # Custom hooks
│   └── package.json
│
└── README.md
```

## 📝 Notes

- Database sẽ tự động được tạo và seed data khi backend khởi động lần đầu
- JWT token có thời hạn 120 phút (có thể cấu hình)
- AI overview tự động load khi vào trang chi tiết
- Tất cả endpoints ngoại trừ auth và AI overview đều yêu cầu authentication

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is for educational purposes.

---

**Made with ❤️ for FPT University MMA301**
